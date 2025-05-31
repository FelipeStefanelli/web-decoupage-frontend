import { useState, useRef } from 'react';
import Image from "@/components/Image";
import { v4 as uuidv4 } from 'uuid';
import { formatTimecode, calculateDifference, fileToBase64, base64ToFile } from "@/utils/utils";
import { toast } from 'react-toastify';
import { useVisibility } from '@/contexts/VisibilityContext';
import ImageEditor from '@/components/ImageEditor';

const VideoUploader = () => {
  const [currentTimecodeIn, setCurrentTimecodeIn] = useState(null);
  const [currentTimecodeOut, setCurrentTimecodeOut] = useState(null);
  const [currentTimecodeImage, setCurrentTimecodeImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [videoName, setVideoName] = useState(null);
  const [videoSrc, setVideoSrc] = useState(undefined);
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
  
  const [segments, setSegments] = useState([]);

  const videoRef = useRef(null);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const { projectName, setChangeProject } = useVisibility();

  const handleVideoChange = async (event) => {
    const file = event.target.files?.[0];
  
    if (file) {
      // Revoga o objeto anterior antes de gerar outro
      if (videoSrc) URL.revokeObjectURL(videoSrc);
  
      const isDifferent = file !== originalFilePath;
      if (isDifferent) {
        resetVideoState(); // limpa apenas se for novo
      }
  
      const videoURL = URL.createObjectURL(file);
      setOriginalFilePath(file);
      setVideoSrc(videoURL);
      setVideoName(file.name);

      // Transcreve direto com path do arquivo
      handleTranscription(file);
    }
  
    fileInputRef.current.value = '';
  };

  const handleTranscription = async (file) => {
    setIsLoadingDetails(true);
    try {
      const form = new FormData();
      form.append('video', file);

      const res = await fetch('http://localhost:4000/api/transcribe-video', {
        method: 'POST',
        body: form
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
      console.error(err);
      toast.error('Erro na transcrição');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const resetVideoState = () => {
    if (videoSrc) {
      URL.revokeObjectURL(videoSrc);
    }
  
    setCurrentTimecodeIn(null);
    setCurrentTimecodeOut(null);
    setCurrentTimecodeImage(null);
    setVideoSrc(undefined);
    setVideoName(null);
    setOriginalFilePath(null);
  
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.removeAttribute('src');
      videoRef.current.load();
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
    }
  };

  const handleOutClick = () => {
    if (videoRef.current) {
      const currentTime = videoRef.current.currentTime;
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
        videoName,
      };

      try {
        const file = base64ToFile(currentTimecodeImage.split(',')[1], `${controlId}.png`);
        await uploadTimecode(file, newTimecode);
        setChangeProject(true);
      } catch (error) {
        console.error('Erro ao enviar timecode para o servidor:', error);
      }

      setCurrentTimecodeIn(0);
      setCurrentTimecodeOut(0);
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
        videoName: file.name,
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
    const response = await fetch(`http://localhost:4000/api?projectName=${projectName}`, {
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

      const res = await fetch('http://localhost:4000/api/convert-video', {
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

      const res = await fetch('http://localhost:4000/api/extract-audio', {
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
      await navigator.clipboard.writeText(textContent); // Usando a Clipboard API para copiar o texto
      alert('Texto copiado para a área de transferência!');
    } catch (err) {
      console.error('Erro ao copiar para a área de transferência: ', err);
    }
  }
  return (
    <div style={{ backgroundColor: "rgba(27, 27, 27, 1)", minHeight: "calc(100vh - 78px)", maxHeight: "calc(100vh - 78px)", paddingLeft: 48, width: '40%', display: 'flex', flexDirection: 'column', alignItems: 'center', boxSizing: 'border-box' }}>
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
            type="file"
            accept="video/*"
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
      {videoSrc && (
        <div style={{ padding: '16px' }}>
          <video ref={videoRef} controls width="100%" crossOrigin="anonymous">
            <source src={videoSrc} type="video/mp4" />
            Seu navegador não suporta vídeos.
          </video>
          <div
            style={{
              width: '80%',
              display: 'flex',
              gap: '0.5rem',
              marginTop: '1rem'
            }}
          >
            <button
              onClick={handleInClick}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "6px 12px", color: "white", fontWeight: "600", backgroundColor: "rgba(196, 48, 43, 1)", border: "2px solid rgba(196, 48, 43, 1)", borderRadius: "8px", cursor: 'pointer' }}
            >
              IN
            </button>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "6px 12px", backgroundColor: "rgba(230, 224, 233, 0.12)", color: "rgba(255, 255, 255, 1)", borderRadius: "8px", fontSize: '12px' }}>{formatTimecode(currentTimecodeIn)}</div>
            <button
              onClick={handleOutClick}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "6px 12px", color: "rgba(196, 48, 43, 1)", fontWeight: "600", backgroundColor: "transparent", border: "2px solid rgba(196, 48, 43, 1)", borderRadius: "8px", cursor: 'pointer' }}
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
          
          {videoSrc && (
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

                      <div style={{ display: 'flex', gap: '32px', alignItems: 'center'}}>
                        <Image
                          src="/copy.svg"
                          alt="Copiar transcrição"
                          width={30}
                          height={30}
                          style={{ width: "30px", height: "30px", cursor: 'pointer' }}
                          onClick={() => copyToClipboard()}
                        />
                        <Image
                          src="/close-white.svg"
                          alt="Close icon"
                          width={32}
                          height={32}
                          style={{ width: "32px", height: "32px", cursor: 'pointer' }}
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
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {videoSrc && (
            <div style={{ marginTop: '1rem', width: '100%' }}>
              <details style={{ background: '#1e1e1e', borderRadius: '8px', padding: '1rem', marginTop: '1rem' }}>
                <summary style={{ color: 'white', fontSize: '14px', cursor: 'pointer' }}>
                  Exportações (vídeo / áudio)
                </summary>

                <div style={{
                  marginTop: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap'
                }}>
                  {/* Bloco de conversão de vídeo */}
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
