import React, { useEffect, useState } from 'react';
import { formatTimecode } from "@/utils/utils";
import CustomImage from "@/components/Image";
import TimecodeInput from "./TimecodeInput";
import TimecodeType from "./TimecodeType";
import ReactStars from "react-stars";
import { useVisibility } from '@/contexts/VisibilityContext';
import { toast } from 'react-toastify';

// cache global por id do timecode (persiste no módulo)
const imageBlobCache = new Map();

const TimecodeCard = ({
  id,
  timecode,
  updateTimecode,
  setActiveMenu,
  activeMenu,
  ratingChanged,
  type,
  views,
  cardType,
  projectName,
  fetchTimecodes,
  setIsDraggingOverTextarea,
  base64Map
}) => {
  const { apiUrl } = useVisibility();

  // ===== IMAGEM OTIMIZADA + LOADING =========================================
  const [resolvedSrc, setResolvedSrc] = useState(null);
  const [imgLoading, setImgLoading] = useState(!!timecode?.imageUrl);

  // ajuste de nitidez sem inflar demais
  const dpr = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 2;
  const SCALE = Math.min(3, Math.max(2, Math.ceil(dpr)));
  const DISPLAY_H = 100;                 // altura real usada no layout
  const TARGET_H = DISPLAY_H * SCALE * 2; // oversampling p/ ficar nítido

  useEffect(() => {
    setImgLoading(!!timecode?.imageUrl);
  }, [timecode?.imageUrl]);

  useEffect(() => {
    let alive = true;

    function blobToImage(blob) {
      return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
        img.src = url;
      });
    }

    async function downscaleImage(blob, maxH) {
      let bmp = null;
      try { bmp = await createImageBitmap(blob); } catch (e) { bmp = null; }

      let w, h;
      if (bmp) {
        const ratio = bmp.height > maxH ? maxH / bmp.height : 1;
        w = Math.round(bmp.width * ratio);
        h = Math.round(bmp.height * ratio);
      } else {
        const img = await blobToImage(blob);
        const ratio = img.naturalHeight > maxH ? maxH / img.naturalHeight : 1;
        w = Math.round(img.naturalWidth * ratio);
        h = Math.round(img.naturalHeight * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context não disponível');

      if (bmp) {
        ctx.drawImage(bmp, 0, 0, w, h);
        if (bmp.close) bmp.close();
      } else {
        const img = await blobToImage(blob);
        ctx.drawImage(img, 0, 0, w, h);
      }

      const outBlob = await new Promise((resolve, reject) => {
        if (canvas.toBlob) {
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas.toBlob retornou null'))), 'image/jpeg', 0.88);
        } else {
          try {
            const dataURL = canvas.toDataURL('image/jpeg', 0.88);
            const [header, data] = dataURL.split(',');
            const mime = header.match(/:(.*?);/)[1];
            const bin = atob(data);
            const u8 = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
            resolve(new Blob([u8], { type: mime }));
          } catch (err) { reject(err); }
        }
      });

      return outBlob;
    }

    async function resolveImage() {
      if (!timecode?.imageUrl) { setResolvedSrc(null); setImgLoading(false); return; }

      const imgId = timecode.id;
      const fullUrl = `${apiUrl ? apiUrl : "http://localhost:4000"}${timecode.imageUrl}`;

      // 1) veio do pai (compatível com seu fluxo)
      if (base64Map && base64Map[imgId]) { if (alive) { setResolvedSrc(base64Map[imgId]); setImgLoading(false); } return; }

      // 2) cache global
      const cached = imageBlobCache.get(imgId);
      if (cached) { if (alive) { setResolvedSrc(cached); setImgLoading(false); } return; }

      // 3) fetch + compress + Blob URL
      try {
        setImgLoading(true);
        const res = await fetch(fullUrl, {
          method: 'GET',
          headers: { 'ngrok-skip-browser-warning': '1', 'Accept': 'image/*' }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const blob = await res.blob();
        const processed = await downscaleImage(blob, TARGET_H);
        const url = URL.createObjectURL(processed);
        imageBlobCache.set(imgId, url);
        if (alive) { setResolvedSrc(url); setImgLoading(false); }
      } catch (e) {
        console.warn('Erro carregando imagem', fullUrl, e);
        if (alive) { setResolvedSrc(fullUrl); setImgLoading(false); } // fallback
      }
    }

    resolveImage();
    return () => { alive = false; };
  }, [timecode?.id, timecode?.imageUrl, apiUrl, base64Map]);
  // ==========================================================================

  const src =
    resolvedSrc ||
    (timecode?.imageUrl ? `${apiUrl ? apiUrl : "http://localhost:4000"}${timecode.imageUrl}` : '');

  const deleteTimecode = async (idToDelete) => {
    const response = await fetch(`${apiUrl ? apiUrl : 'http://localhost:4000'}/api?projectName=${projectName}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: idToDelete }),
    });
    fetchTimecodes();
    return await response.json();
  };

  const renderFilename = (filename, maxLength = 20) => {
    if (!filename) return '';
    const dotIndex = filename.lastIndexOf('.');
    const hasExtension = dotIndex !== -1;
    const name = hasExtension ? filename.slice(0, dotIndex) : filename;
    const ext = hasExtension ? filename.slice(dotIndex) : '';
    if (filename.length <= maxLength) return filename;
    const allowedNameLength = maxLength - ext.length - 3;
    const shortName = name.slice(0, allowedNameLength);
    return `${shortName}..${ext}`;
  };

  const verifyViews = (field) => {
    if (cardType === 'script' && views[field] === 'show') return true;
    if (cardType === 'timecode') return true;
    return false;
  };

  return (
    <div
      id="card"
      style={{
        width: "100%",
        height: '100%',
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "white",
        borderRadius: "4px",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
      }}
    >
      {((timecode.imageUrl && cardType !== 'script') || (cardType === "script" && timecode.type !== 'A')) && (
        <div
          style={{
            position: 'relative',            // contexto pro overlay
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            minWidth: '100%',
            backgroundColor: 'rgb(54, 54, 54)',
            borderTopLeftRadius: '4px',
            borderTopRightRadius: '4px',
            height: '100px',
            padding: '16px 0',
            overflow: 'hidden'
          }}
        >
          {/* overlay loading */}
          {imgLoading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.15)',
                zIndex: 3
              }}
            >
              <CustomImage src="/loading.svg" alt="Carregando" width={28} height={28} />
            </div>
          )}

          <img
            src={src}
            alt={`Thumbnail at ${timecode.inTime}`}
            loading="lazy"
            decoding="async"
            onLoad={() => setImgLoading(false)}
            onError={() => setImgLoading(false)}
            style={{
              maxHeight: '100px',
              height: 'auto',
              width: 'auto',
              maxWidth: '100%',
              display: 'block',
              margin: '0 auto',
              userSelect: 'none',
              pointerEvents: 'none',
              borderRadius: '2px',
              objectFit: 'cover',
              position: 'relative',
              zIndex: 2,
            }}
          />
        </div>
      )}

      <div
        style={type !== 'audio'
          ? { display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: "12px", margin: "4px 0 8px 0" }
          : { display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: "12px", margin: "6px 0 12px 0" }
        }
      >
        <TimecodeType
          id={id}
          timecode={timecode}
          updateTimecode={updateTimecode}
          setActiveMenu={setActiveMenu}
          activeMenu={activeMenu}
          readOnly={type === 'AV-audio' || (cardType === "script" && timecode.type === "AV") ? true : false}
        />
        {type !== 'AV-audio' && verifyViews('classification-view') &&
          <ReactStars
            value={timecode.rating}
            count={3}
            onChange={(newRating) => ratingChanged(timecode, newRating)}
            size={25}
            color1={"#b4b4b4"}
            color2={"#ffd700"}
          />
        }
      </div>

      {type !== 'AV-audio' &&
        <TimecodeInput
          timecode={timecode}
          updateTimecode={updateTimecode}
          setIsDraggingOverTextarea={setIsDraggingOverTextarea}
        />
      }

      {type !== 'AV-audio' &&
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2px', padding: '8px 12px 4px 12px', fontSize: '9px' }}>
            <p style={{ borderRadius: '2px', padding: '2px', color: 'rgb(18, 14, 35)', fontWeight: '600', lineHeight: '10px', letterSpacing: '0.1px', textAlign: 'center', margin: 0 }}>
              {formatTimecode(timecode.inTime)}
            </p>
            ·
            <p style={{ borderRadius: '2px', padding: '2px', color: 'rgb(18, 14, 35)', fontWeight: '600', lineHeight: '10px', letterSpacing: '0.1px', textAlign: 'center', margin: 0 }}>
              {formatTimecode(timecode.outTime)}
            </p>
            ·
            <p style={{ borderRadius: '4px', padding: '4px', backgroundColor: 'rgb(18, 14, 35)', color: 'white', fontWeight: '600', lineHeight: '10px', letterSpacing: '0.1px', textAlign: 'center', margin: 0 }}>
              {formatTimecode(timecode.duration)}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: "8px 12px 16px 12px" }}>
            <CustomImage
              aria-hidden
              src="/trash.svg"
              alt="Trash icon"
              width={20}
              height={20}
              style={{ width: "20px", height: "20px", cursor: "pointer" }}
              onClick={() => deleteTimecode(timecode.id)}
            />
            <CustomImage
              aria-hidden
              src="/copy.svg"
              alt="Copy icon"
              width={18}
              height={18}
              style={{ width: "18px", height: "18px", cursor: "pointer" }}
              onClick={async () => {
                const textContent = `${timecode.mediaName} - ${formatTimecode(timecode.inTime)} ~ ${formatTimecode(timecode.outTime)}`;
                try {
                  await navigator.clipboard.writeText(textContent);
                  toast('Texto copiado para a área de transferência!');
                } catch (err) {
                  console.error('Erro ao copiar para a área de transferência: ', err);
                }
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', width: 'calc(100% - 32px)' }}>
              <p
                style={{
                  fontSize: '10px',
                  fontWeight: '500',
                  lineHeight: '12px',
                  letterSpacing: '0.1px',
                  textAlign: 'end',
                  color: 'black',
                  maxWidth: 'calc(100% - 32px)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  margin: 0
                }}
                title={timecode.mediaName}
              >
                {renderFilename(timecode.mediaName)}
              </p>
            </div>
          </div>
        </>
      }
    </div>
  );
};

export default TimecodeCard;
