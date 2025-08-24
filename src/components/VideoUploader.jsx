import { useState, useRef, useCallback, useEffect } from 'react';
import Image from "@/components/Image";
import { v4 as uuidv4 } from 'uuid';
import { formatTimecode, calculateDifference, fileToBase64, base64ToFile } from "@/utils/utils";
import { toast } from 'react-toastify';
import { useVisibility } from '@/contexts/VisibilityContext';
import ImageEditor from '@/components/ImageEditor';
import { useHotkeys } from "../hooks/useHotKeys.js";
import CustomPlayer from './CustomPlayer.jsx';

const VideoUploader = () => {
  const [currentTimecodeIn, setCurrentTimecodeIn] = useState(null);
  const [currentTimecodeOut, setCurrentTimecodeOut] = useState(null);
  const [currentTimecodeImage, setCurrentTimecodeImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mediaName, setMediaName] = useState(null);
  const [mediaSrc, setMediaSrc] = useState(undefined);
  const [mediaType, setMediaType] = useState(undefined);
  const [selectedFormat, setSelectedFormat] = useState('mp4');
  const [audioSelectedFormat, setAudioSelectedFormat] = useState('mp3');
  const [originalFilePath, setOriginalFilePath] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [extractingAudio, setExtractingAudio] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImageName, setSelectedImageName] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [transcriptionTotalTime, setTranscriptionTotalTime] = useState(null);
  const [revSpeed, setRevSpeed] = useState(null);
  const [fwdSpeed, setFwdSpeed] = useState(null);
  const [segments, setSegments] = useState([]);

  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const transcriptionController = useRef(null);

  const { projectName, setChangeProject, apiUrl } = useVisibility();

  const handleVideoChange = async (event) => {
    const file = event.target.files?.[0];

    if (file) {
      if (transcriptionController.current) {
        transcriptionController.current.abort()
      }
      if (mediaSrc) URL.revokeObjectURL(mediaSrc);

      const isDifferent = file !== originalFilePath;
      if (isDifferent) {
        resetVideoState(); // limpa apenas se for novo
      }
      const fileType = file.type.startsWith('audio/') ? 'audio' : file.type.startsWith('video/') ? 'video' : undefined;
      const videoURL = URL.createObjectURL(file);
      setOriginalFilePath(file);
      setMediaType(fileType);
      setMediaSrc(videoURL);
      setMediaName(file.name);

      const controller = new AbortController();
      transcriptionController.current = controller;

      // Transcreve direto com path do arquivo
      handleTranscription(file, controller.signal);
    }

    fileInputRef.current.value = '';
  };

  const handleTranscription = async (file, signal) => {
    setIsLoadingDetails(true);
    try {
      const form = new FormData();
      form.append('video', file);

      const res = await fetch(`${apiUrl ? apiUrl : 'http://localhost:4000'}/api/transcribe-video`, {
        method: 'POST',
        body: form,
        signal
      });
      const transRes = await res.json();

      if (res.ok && transRes.success) {
        setSegments(transRes.segments);
        setTranscriptionTotalTime(transRes.totalTime);
        setShowDetailsModal(true);
      } else {
        toast.error(transRes.error || 'Erro na transcrição');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Requisição de transcrição abortada com sucesso.')
        return
      }
      console.error(err);
      toast.error('Erro na transcrição');
    } finally {
      if (transcriptionController.current && transcriptionController.current.signal === signal) {
        setIsLoadingDetails(false);
        transcriptionController.current = null
      }
    }
  };

  const resetVideoState = () => {
    if (mediaSrc) {
      URL.revokeObjectURL(mediaSrc);
    }
    setSegments([]);
    setTranscriptionTotalTime(null);
    setShowDetailsModal(false);
    setCurrentTimecodeIn(null);
    setCurrentTimecodeOut(null);
    setCurrentTimecodeImage(null);
    setMediaSrc(undefined);
    setMediaType(undefined);
    setMediaName(null);
    setOriginalFilePath(null);

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.removeAttribute('src');
      videoRef.current.load();
    } else if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }
  };

  const handleInClick = () => {
    if (videoRef.current) {
      const currentTime = videoRef.current.currentTime;
      console.log(currentTime)
      setCurrentTimecodeIn(currentTime);

      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const image = canvas.toDataURL();
        setCurrentTimecodeImage(image);
      }
    } else if (audioRef.current) {
      const currentTime = audioRef.current.currentTime;
      console.log(currentTime)
      setCurrentTimecodeIn(currentTime);
    }
  };

  const handleOutClick = () => {
    if (videoRef.current) {
      const currentTime = videoRef.current.currentTime;
      setCurrentTimecodeOut(currentTime);
    } else if (audioRef.current) {
      const currentTime = audioRef.current.currentTime;
      setCurrentTimecodeOut(currentTime);
    }
  };

  const handleAddTimecode = async () => {
    setLoading(true);
    if (currentTimecodeIn !== null && currentTimecodeOut !== null && currentTimecodeImage) {
      const controlId = uuidv4();
      const newTimecode = {
        id: controlId,
        inTime: currentTimecodeIn,
        outTime: currentTimecodeOut,
        duration: calculateDifference(currentTimecodeIn, currentTimecodeOut),
        type: "",
        text: "",
        rating: 0,
        mediaName,
      };

      try {
        const file = base64ToFile(currentTimecodeImage.split(',')[1], `${controlId}.png`);
        await uploadTimecode(file, newTimecode);
        setChangeProject(true);
      } catch (error) {
        console.error('Erro ao enviar timecode para o servidor:', error);
      }

      setCurrentTimecodeIn(null);
      setCurrentTimecodeOut(null);
      setCurrentTimecodeImage(null);
      setLoading(false);
    }
  };

  const handleImageImport = async (file) => {
    if (!file || !(file instanceof Blob)) {
      toast.error('Imagem inválida ou não reconhecida.');
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      const controlId = uuidv4();

      const newTimecode = {
        id: controlId,
        inTime: 0,
        outTime: 0,
        duration: 0,
        type: "image",
        text: "",
        rating: 0,
        mediaName: file.name,
      };

      const base64Clean = base64.replace(/^data:image\/\w+;base64,/, '');
      const fileObj = base64ToFile(base64Clean, `${controlId}.png`);
      await uploadTimecode(fileObj, newTimecode);

      setChangeProject(true);
      toast.success('Imagem importada e texto extraído!');
    } catch (err) {
      console.error('Erro ao importar ou ler imagem:', err);
      toast.error('Erro ao importar ou ler imagem');
    } finally {
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const uploadTimecode = async (file, newTimecode) => {
    const fileContent = await fileToBase64(file);
    const response = await fetch(`${apiUrl ? apiUrl : 'http://localhost:4000'}/api?projectName=${projectName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileContent, timecode: newTimecode }),
    });
    return await response.json();
  };

  const convertVideo = async (file, format = 'webm') => {
    setIsExporting(true);
    try {
      const form = new FormData();
      form.append('video', file);
      form.append('format', format);

      const res = await fetch(`${apiUrl ? apiUrl : 'http://localhost:4000'}/api/convert-video`, {
        method: 'POST',
        body: form
      });

      if (!res.ok) throw new Error();
      // o endpoint irá forçar download do arquivo convertido
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      // tenta pegar nome enviado pelo header; se não, cai em default
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="?(.+)"?/);
      const filename = match ? match[1] : `video-convertido.${format}`;

      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Vídeo convertido com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro na conversão de vídeo');
    } finally {
      setIsExporting(false);
    }
  };
  const exportAudio = async (file, format = 'mp3') => {
    setExtractingAudio(true);
    try {
      const form = new FormData();
      form.append('video', file);
      form.append('format', format);

      const res = await fetch(`${apiUrl ? apiUrl : 'http://localhost:4000'}/api/extract-audio`, {
        method: 'POST',
        body: form
      });

      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="?(.+)"?/);
      const filename = match ? match[1] : `audio-extraido.${format}`;

      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Áudio extraído com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro na extração de áudio');
    } finally {
      setExtractingAudio(false);
    }
  };
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };
  const copyToClipboard = async () => {
    const textContent = segments.map((seg) => `${formatTime(seg.start)} · ${formatTime(seg.end)}\n${seg.text}`).join('\n\n');

    try {
      await navigator.clipboard.writeText(textContent);
      toast('Texto copiado para a área de transferência!');
    } catch (err) {
      console.error('Erro ao copiar para a área de transferência: ', err);
    }
  }

  const copyEachToClipboard = async (textContent) => {
    try {
      await navigator.clipboard.writeText(textContent);
      toast('Texto copiado para a área de transferência!');
    } catch (err) {
      console.error('Erro ao copiar para a área de transferência: ', err);
    }
  }
  const oBtnRef = useRef(null);
  const iBtnRef = useRef(null);
  const dotBtnRef = useRef(null);
  const SPEEDS = [1, 2, 3];

  const handleO = useCallback(() => {
    console.log("click O")
    oBtnRef.current?.click();
  }, []);
  const handleI = useCallback(() => {
    console.log("click I")
    iBtnRef.current?.click();
  }, []);
  const handleDot = useCallback(() => {
    console.log("click .")
    dotBtnRef.current?.click();
  }, []);
  const seekBy = useCallback((delta) => {
    console.log(`click ${delta}`)
    // pega o elemento certo
    const el = mediaType === 'audio' ? audioRef.current : videoRef.current;
    if (!el) return;

    const cur = Number.isFinite(el.currentTime) ? el.currentTime : 0;
    const dur = Number.isFinite(el.duration) ? el.duration : undefined;

    let next = cur + delta;
    // clamp: [0, duration] se soubermos a duração; senão, só >= 0
    next = dur !== undefined ? Math.min(Math.max(0, next), dur) : Math.max(0, next);

    try {
      el.currentTime = next;
    } catch (_) {
      // silencioso: alguns players podem recusar durante determinados estados
    }
  }, [mediaType]);

  const fwdIdxRef = useRef(-1);             // -1 = inativo; 0..2 = 1x/2x/4x
  const revStateRef = useRef({               // controle do "reverse" (J)
    active: false,
    idx: 0,                                  // 0..2 = 1x/2x/4x
    rafId: null,
    lastTs: 0
  });

  const getMediaEl = () => (mediaType === 'audio' ? audioRef.current : videoRef.current);

  const stopReverse = useCallback(() => {
    const st = revStateRef.current;
    if (st.rafId) cancelAnimationFrame(st.rafId);
    st.active = false;
    st.idx = 0;
    st.rafId = null;
    st.lastTs = 0;
    setRevSpeed(null);
  }, []);

  const stopForward = useCallback(() => {
    fwdIdxRef.current = -1;
    const el = getMediaEl();
    if (el) el.playbackRate = 1;
    setFwdSpeed(null);
  }, []);

  const startOrCycleReverse = useCallback(() => {
    const el = getMediaEl();
    if (!el) return;

    // sair do forward e pausar player
    stopForward();
    try { el.pause?.(); } catch { }

    fwdIdxRef.current = -1;
    el.playbackRate = 1;

    const st = revStateRef.current;
    if (st.active) {
      st.idx = (st.idx + 1) % SPEEDS.length;     // 1→2→4→1
      setRevSpeed(SPEEDS[st.idx]);               // mostra ⏪ Nx
      return;
    }

    st.active = true;
    st.idx = 0;
    st.lastTs = 0;
    setRevSpeed(SPEEDS[st.idx]);                 // ⏪ 1x

    const step = (ts) => {
      const s = revStateRef.current;
      if (!s.active) return;

      if (!s.lastTs) { s.lastTs = ts; s.rafId = requestAnimationFrame(step); return; }
      const dt = (ts - s.lastTs) / 1000;
      s.lastTs = ts;

      const speed = SPEEDS[s.idx];
      const media = getMediaEl();
      if (!media) return;

      const next = (media.currentTime || 0) - speed * dt;
      media.currentTime = Math.max(0, next);

      if (media.currentTime <= 0) {
        stopReverse();
        return;
      }
      s.rafId = requestAnimationFrame(step);
    };

    st.rafId = requestAnimationFrame(step);
  }, [stopForward, stopReverse]);

  const accelForward = useCallback(() => {
    const el = getMediaEl();
    if (!el) return;

    // sair do reverse e limpar indicador ⏪
    stopReverse();

    // cicla 1→2→4→1
    if (fwdIdxRef.current === -1) {
      fwdIdxRef.current = 0;                      // começa em 1x
    } else {
      fwdIdxRef.current = (fwdIdxRef.current + 1) % SPEEDS.length;
    }

    const rate = SPEEDS[fwdIdxRef.current];
    el.playbackRate = rate;

    setFwdSpeed(rate);                             // <-- mostra ▶️ Nx

    const p = el.play?.();
    if (p && typeof p.then === 'function') p.catch(() => { });
  }, [stopForward, stopReverse]);

  // opcional: ao pausar manualmente, desligue estados de shuttle/aceleração
  const resetRates = useCallback(() => {
    const el = getMediaEl();
    if (el) el.playbackRate = 1;
    fwdIdxRef.current = -1;
    stopForward();
    stopReverse();

  }, [mediaType, stopReverse, stopForward]);

  // seu toggle atual, adicionando reset quando pausar
  const togglePlayPause = useCallback(() => {
    const el = mediaType === 'audio' ? audioRef.current : videoRef.current;
    if (!el) return;

    if (el.paused || el.ended) {
      const p = el.play?.();
      if (p && typeof p.then === 'function') p.catch(() => { });
    } else {
      try { el.pause?.(); } catch { }
      resetRates(); // <- volta playbackRate pra 1 e desliga reverse
    }
  }, [mediaType, resetRates]);

  // limpesa ao desmontar
  useEffect(() => {
    return () => {
      resetRates();
    };
  }, [resetRates]);

  useEffect(() => {
    const BLOCK_INPUT_TYPES = new Set(["button", "checkbox", "color", "file", "hidden", "image", "radio", "range", "reset", "submit"]);
    const isTyping = (el) => {
      const node = el && el.nodeType === 1 ? el : null;
      if (!node) return false;
      if (node.closest && node.closest('[data-hotkeys="off"]')) return true;
      if (node.isContentEditable) return true;
      const tag = (node.tagName || "").toUpperCase();
      if (tag === "TEXTAREA") return true;
      if (tag === "INPUT") {
        const t = (node.type || "").toLowerCase();
        return !BLOCK_INPUT_TYPES.has(t);
      }
      return false;
    };

    const onKeyUp = (e) => {
      const key = (e.key || e.code || "").toLowerCase();
      if (key !== " " && key !== "spacebar" && key !== "space") return;

      if (isTyping(e.target)) return;
      e.preventDefault();
      e.stopPropagation();

      togglePlayPause();
    };

    // captura pra vencer handlers nativos de controles
    window.addEventListener("keyup", onKeyUp, true);
    document.addEventListener("keyup", onKeyUp, true);
    return () => {
      window.removeEventListener("keyup", onKeyUp, true);
      document.removeEventListener("keyup", onKeyUp, true);
    };
  }, [togglePlayPause]);

  useHotkeys({
    "o": handleO,
    "i": handleI,
    ".": handleDot,
    "<": () => seekBy(-0.03),
    ">": () => seekBy(+0.03),
    arrowleft: () => seekBy(-0.03),
    arrowright: () => seekBy(+0.03),
    j: startOrCycleReverse,
    k: resetRates,
    l: accelForward,
  });

  const blurIfFocused = () => {
    const el = videoRef.current;
    if (el && document.activeElement === el) {
      el.blur();
    }
  };
  const blurNextTick = () => requestAnimationFrame(blurIfFocused);
  return (
    <div style={{ backgroundColor: "rgba(27, 27, 27, 1)", minHeight: "calc(100vh - 77px)", maxHeight: "calc(100vh - 77px)", paddingLeft: 48, width: '40%', display: 'flex', flexDirection: 'column', alignItems: 'center', boxSizing: 'border-box' }}>
      <div style={{ width: 'calc(100% - 32px)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '24px 16px 8px 16px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '24px',
          flex: 1,

        }}>
          <button
            onClick={() => imageInputRef.current?.click()}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              padding: "8px 16px",
              backgroundColor: "rgba(48, 48, 48, 1)",
              borderRadius: "8px",
              color: "white",
              flex: 1,
              cursor: 'pointer'
            }}
          >
            <Image
              aria-hidden
              src="/import.svg"
              alt="Import vídeo icon"
              width={20}
              height={20}
            />
            <p style={{ margin: 0, fontSize: '14px' }}>Importar Imagem</p>
          </button>
          <input
            name="import-image"
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            ref={imageInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              console.log('file', file);
              if (!file) return;

              const reader = new FileReader();

              reader.onload = e => {
                setSelectedImageName(file.name);
                setSelectedImage(e.target.result);
                setShowCropModal(true);
              };

              reader.readAsDataURL(file);

              e.target.value = '';
            }}
            style={{ display: 'none' }}
          />
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '24px',
          flex: 1,
        }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              padding: "8px 16px",
              backgroundColor: "rgba(48, 48, 48, 1)",
              borderRadius: "8px",
              color: "white",
              flex: 1,
              cursor: 'pointer'
            }}
          >
            <Image
              aria-hidden
              src="/import.svg"
              alt="Import vídeo icon"
              width={20}
              height={20}
            />
            <p style={{ margin: 0, fontSize: '14px' }}>Importar Vídeo</p>
          </button>
          <input
            name="import-media"
            type="file"
            accept="video/*,audio/*"
            ref={fileInputRef}
            onChange={handleVideoChange}
            style={{ display: 'none' }}
          />
        </div>
      </div>
      {showCropModal && (
        <div
          onClick={() => setShowCropModal(false)} // fecha ao clicar fora
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()} // evita fechar ao clicar dentro
            style={{
              position: 'relative',
              backgroundColor: 'white',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '800px',
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              padding: '1rem',
            }}
          >
            {/* Botão de fechar */}
            <Image
              src="/close-white.svg"
              alt="Close icon"
              width={32}
              height={32}
              style={{ width: "32px", height: "32px", cursor: 'pointer' }}
              onClick={() => setShowCropModal(false)}
            />
            {/* Editor de imagem */}
            <ImageEditor
              imageSrc={selectedImage}
              onApplyCrop={async (blob) => {
                const file = new File([blob], selectedImageName || 'imagem-cortada.png', {
                  type: 'image/png',
                });
                await handleImageImport(file); // <-- passe o File diretamente
                setShowCropModal(false);
              }}
            />
          </div>
        </div>
      )}
      {mediaSrc && (
        <div style={{ width: 'calc(100% - 32px)', padding: '16px' }}>
          <div style={{ position: 'relative' }}>
            {mediaType === 'video' &&
              <video
                ref={videoRef}
                controls
                width="100%"
                controlsList="nodownload noplaybackrate"
                disablePictureInPicture
                disableRemotePlayback
                // iOS Safari (AirPlay):
                x-webkit-airplay="deny"
                tabIndex={-1}
                onFocus={blurNextTick}
                onPointerUpCapture={blurNextTick}
              >
                <source src={mediaSrc} type="video/mp4" />
                Seu navegador não suporta vídeos.
              </video>
            }
            {/** mediaType === 'video' &&
              <CustomPlayer videoRef={videoRef} src={mediaSrc} type="video/mp4" />
            **/}
            <div style={{ position: 'absolute', bottom: '40px', right: 'calc(50% - 22px)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {revSpeed !== null &&
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'white', fontSize: '13px', fontWeight: '500', userSelect: 'none' }}>
                  <Image
                    aria-hidden
                    src="/arrow-backward.svg"
                    alt="Arrow backward"
                    width={22}
                    height={22}
                    style={{ width: "22px", height: "22px" }}
                    priority
                  />
                  <span>{revSpeed}x</span>
                </div>
              }
              {fwdSpeed !== null &&
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'white', fontSize: '13px', fontWeight: '500', userSelect: 'none' }}>
                  <span>{fwdSpeed}x</span>
                  <Image
                    aria-hidden
                    src="/arrow-forward.svg"
                    alt="Arrow forward"
                    width={22}
                    height={22}
                    style={{ width: "22px", height: "22px" }}
                    priority
                  />
                </div>
              }
            </div>
          </div>
          {mediaType === 'audio' && (
            <audio ref={audioRef} controls style={{ width: '100%' }}>
              <source src={mediaSrc} type={originalFilePath.type} />
              Seu navegador não suporta áudio.
            </audio>
          )}
          <div
            style={{
              width: '100%',
              display: 'flex',
              gap: '0.5rem',
              marginTop: '1rem'
            }}
          >
            <button
              onClick={handleInClick}
              ref={iBtnRef}
              style={
                {
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "6px 12px",
                  color: currentTimecodeIn !== null ? "white" : "rgba(196, 48, 43, 1)",
                  fontWeight: "600",
                  backgroundColor: currentTimecodeIn !== null ? "rgba(196, 48, 43, 1)" : "transparent",
                  border: "2px solid rgba(196, 48, 43, 1)",
                  borderRadius: "8px",
                  cursor: 'pointer'
                }
              }
            >
              IN
            </button>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "6px 12px", backgroundColor: "rgba(230, 224, 233, 0.12)", color: "rgba(255, 255, 255, 1)", borderRadius: "8px", fontSize: '12px' }}>{formatTimecode(currentTimecodeIn)}</div>
            <button
              onClick={handleOutClick}
              ref={oBtnRef}
              style={
                {
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "6px 12px",
                  color: currentTimecodeOut !== null ? "white" : "rgba(196, 48, 43, 1)",
                  fontWeight: "600",
                  backgroundColor: currentTimecodeOut !== null ? "rgba(196, 48, 43, 1)" : "transparent",
                  border: "2px solid rgba(196, 48, 43, 1)",
                  borderRadius: "8px",
                  cursor: 'pointer'
                }
              }
            >
              OUT
            </button>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "6px 12px", backgroundColor: "rgba(230, 224, 233, 0.12)", color: "rgba(255, 255, 255, 1)", borderRadius: "8px", fontSize: '12px' }}>{formatTimecode(currentTimecodeOut)}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "6px 12px", marginLeft: "auto", backgroundColor: "rgba(230, 224, 233, 0.12)", color: "rgba(255, 255, 255, 1)", borderRadius: "8px", fontSize: '12px' }}>{formatTimecode(calculateDifference(currentTimecodeIn, currentTimecodeOut))}</div>
          </div>
          <div
            style={{
              width: '100%',
              display: 'flex',
              marginTop: '1rem'
            }}
          >
            {loading ?
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  width: '100%'
                }}
              >
                <Image
                  aria-hidden
                  src="/white-loading.svg"
                  alt="Loading Icon"
                  width={48}
                  height={48}
                  style={{ width: "48px", height: "48px" }}
                  priority
                />
              </div>
              :
              <button
                onClick={handleAddTimecode}
                ref={dotBtnRef}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '8px 16px',
                  backgroundColor: currentTimecodeIn === null || currentTimecodeOut === null || !currentTimecodeImage ? 'rgba(169, 169, 169, 0.5)' : 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  color: 'white',
                  cursor: currentTimecodeIn === null || currentTimecodeOut === null || !currentTimecodeImage ? 'not-allowed' : 'pointer',
                  opacity: currentTimecodeIn === null || currentTimecodeOut === null || !currentTimecodeImage ? 0.5 : 1,
                }}
                disabled={currentTimecodeIn === null || currentTimecodeOut === null || !currentTimecodeImage}
              >
                <Image
                  aria-hidden
                  src="/plus.svg"
                  alt="Globe icon"
                  width={16}
                  height={16}
                  style={{ width: "16px", height: "16px" }}
                />
                <b style={{ fontSize: '12px', letterSpacing: '1px' }}>Adicionar Take</b>
              </button>
            }
          </div>

          {mediaSrc && (
            <div style={{ marginTop: '1rem', width: '100%' }}>
              <button
                onClick={() => setShowDetailsModal(true)}
                disabled={isLoadingDetails}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(196, 48, 43, 1)',
                  color: 'white',
                  border: 'none',
                  cursor: isLoadingDetails ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  letterSpacing: '1px',
                  opacity: isLoadingDetails ? 0.7 : 1,
                }}
              >
                {isLoadingDetails ? 'Transcrevendo...' : 'Ver Transcrição'}
              </button>

              {showDetailsModal && (
                <div
                  onClick={() => setShowDetailsModal(false)}
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    zIndex: 999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      backgroundColor: '#fff',
                      borderRadius: '10px',
                      padding: 0,
                      width: '90%',
                      maxWidth: '760px',
                      maxHeight: '80vh',
                      boxShadow: '0 0 20px rgba(0,0,0,0.3)',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {/* Header com o botão de copiar */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '16px',
                      borderBottom: '1px solid #ddd',
                      position: 'sticky',
                      top: 0,
                      backgroundColor: '#fff',
                      zIndex: 1
                    }}>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <p
                          style={{
                            fontWeight: 600,
                            fontSize: '20px',
                            margin: 0
                          }}
                        >
                          Transcrição
                        </p>
                      </div>

                      {/* Ícone de fechar */}

                      <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
                        <Image
                          src="/copy.svg"
                          alt="Copiar transcrição"
                          width={28}
                          height={28}
                          style={{ width: "28px", height: "28px", cursor: 'pointer' }}
                          onClick={() => copyToClipboard()}
                        />
                        <Image
                          src="/close-white.svg"
                          alt="Close icon"
                          width={28}
                          height={28}
                          style={{ width: "28px", height: "28px", cursor: 'pointer' }}
                          onClick={() => setShowDetailsModal(false)}
                        />
                      </div>
                    </div>

                    {/* Conteúdo com scroll */}
                    <div style={{
                      padding: '1rem 1.5rem',
                      overflowY: 'auto'
                    }}>
                      {segments.map((seg, i) => (
                        <div key={i} style={{
                          position: "relative",
                          marginBottom: '1rem',
                          padding: '0.75rem 1rem',
                          background: '#f9f9f9',
                          borderRadius: '6px',
                          border: '1px solid #eee'
                        }}>
                          <small style={{ color: '#c4302b', fontWeight: 600 }}>
                            {formatTime(seg.start)} · {formatTime(seg.end)}
                          </small>
                          <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#333' }}>{seg.text}</p>
                          <Image
                            src="/copy.svg"
                            alt="Copiar transcrição"
                            width={22}
                            height={22}
                            style={{
                              position: "absolute",
                              top: '8px',
                              right: '8px',
                              width: "22px",
                              height: "22px",
                              cursor: 'pointer'
                            }}
                            onClick={() => copyEachToClipboard(seg.text)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {mediaSrc && (
            <div style={{ marginTop: '1rem', width: '100%' }}>
              <details style={{ background: '#1e1e1e', borderRadius: '8px', padding: '1rem', marginTop: '1rem' }}>
                <summary style={{ color: 'white', fontSize: '14px', cursor: 'pointer' }}>
                  Exportações {mediaType === "video" ? "(vídeo / áudio)" : "(áudio)"}
                </summary>

                <div style={{
                  marginTop: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap'
                }}>
                  {mediaType === "video" &&
                    <div style={{ flex: '1 1 45%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <select
                        value={selectedFormat}
                        onChange={(e) => setSelectedFormat(e.target.value)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          backgroundColor: '#333',
                          color: 'white',
                          border: '1px solid #555',
                        }}
                      >
                        <option value="mp4">MP4</option>
                        <option value="mxf">MXF</option>
                        <option value="avi">AVI</option>
                        <option value="mov">MOV</option>
                        <option value="webm">WEBM</option>
                        <option value="mkv">MKV</option>
                      </select>

                      <button
                        onClick={() => convertVideo(originalFilePath, selectedFormat)}
                        disabled={isExporting}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '6px',
                          backgroundColor: isExporting ? '#a42a24' : '#c4302b',
                          color: 'white',
                          border: 'none',
                          cursor: isExporting ? 'not-allowed' : 'pointer',
                          fontWeight: 600,
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        {isExporting ? (
                          <Image src="/white-loading.svg" alt="Loading" width={18} height={18} />
                        ) : (
                          'Converter Vídeo'
                        )}
                      </button>
                    </div>
                  }

                  {/* Bloco de extração de áudio */}
                  <div style={{ flex: '1 1 45%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <select
                      onChange={(e) => setAudioSelectedFormat(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        backgroundColor: '#333',
                        color: 'white',
                        border: '1px solid #555',
                      }}
                    >
                      <option value="mp3">MP3</option>
                      <option value="wav">WAV</option>
                      <option value="ogg">OGG</option>
                      <option value="aac">AAC</option>
                    </select>

                    <button
                      onClick={() => exportAudio(originalFilePath, audioSelectedFormat)}
                      disabled={extractingAudio}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        backgroundColor: extractingAudio ? '#a42a24' : '#c4302b',
                        color: 'white',
                        border: 'none',
                        cursor: extractingAudio ? 'not-allowed' : 'pointer',
                        fontWeight: 600,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      {extractingAudio ? (
                        <Image src="/white-loading.svg" alt="Loading" width={18} height={18} />
                      ) : (
                        'Extrair Áudio'
                      )}
                    </button>
                  </div>
                </div>
              </details>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoUploader;
