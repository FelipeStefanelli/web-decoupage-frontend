import { useState, useEffect, useCallback, useRef } from 'react';
import Image from '@/components/Image';
import ScriptInput from '@/components/ScriptInput';
import { formatTimecode } from '@/utils/utils';
import html2pdf from 'html2pdf.js'
import { useVisibility } from '@/contexts/VisibilityContext';
import ReactStars from 'react-stars';

const HeaderScriptPreview = ({ contentRef, data, projectName, exportDate, views }) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [base64Map, setBase64Map] = useState({});
  const [loading, setLoading] = useState(false);
  const [isDataEmpty, setIsDataEmpty] = useState(false);

  const { apiUrl } = useVisibility();

  // ------- INÍCIO: BLOCO ALTERADO (carregamento de imagens otimizado) -------
  const blobUrlCache = useRef(new Map());

  useEffect(() => {
    setLoading(true);

    async function downscaleImage(blob, maxH) {
      let bmp = null;
      try {
        bmp = await createImageBitmap(blob);
      } catch {
        bmp = null;
      }

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
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas.toBlob retornou null'))), 'image/jpeg', 0.72);
        } else {
          try {
            const dataURL = canvas.toDataURL('image/jpeg', 0.72);
            const b = dataURLToBlob(dataURL);
            resolve(b);
          } catch (err) {
            reject(err);
          }
        }
      });

      return outBlob;
    }

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

    function dataURLToBlob(dataURL) {
      const [header, data] = dataURL.split(',');
      const mime = header.match(/:(.*?);/)[1];
      const bin = atob(data);
      const len = bin.length;
      const u8 = new Uint8Array(len);
      for (let i = 0; i < len; i++) u8[i] = bin.charCodeAt(i);
      return new Blob([u8], { type: mime });
    }

    const loadImagesAsBlobUrls = async () => {
      const scenes = data?.script || [];

      if (!scenes.length) {
        setIsDataEmpty(true);
        setBase64Map({});
        setLoading(false);
        return;
      }
      setIsDataEmpty(false);

      // achata todos os timecodes com imagem
      const allTimecodes = [];
      for (const scene of scenes) {
        for (const tc of scene.timecodes || []) {
          if (tc?.imageUrl && tc?.id) allTimecodes.push(tc);
        }
      }

      const map = {};
      const pool = 6; // concorrência
      let i = 0;

      async function worker() {
        while (i < allTimecodes.length) {
          const idx = i++;
          const tc = allTimecodes[idx];
          const fullUrl = `${apiUrl ? apiUrl : 'http://localhost:4000'}${tc.imageUrl}`;
          try {
            // cache por id
            if (blobUrlCache.current.has(tc.id)) {
              const cached = blobUrlCache.current.get(tc.id);
              if (cached) map[tc.id] = cached;
              continue;
            }

            const res = await fetch(fullUrl, {
              method: 'GET',
              headers: { 'ngrok-skip-browser-warning': '1', 'Accept': 'image/*' }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();

            // comprime/reduz antes de criar o URL
            const compressed = await downscaleImage(blob, 900);
            const url = URL.createObjectURL(compressed);

            blobUrlCache.current.set(tc.id, url);
            map[tc.id] = url;
          } catch (e) {
            console.warn('Erro carregando imagem', fullUrl, e);
          }
        }
      }

      await Promise.all(Array.from({ length: pool }, worker));
      setBase64Map(map);
      setLoading(false);
    };

    loadImagesAsBlobUrls();
  }, [data, apiUrl]);
  // ------- FIM: BLOCO ALTERADO (carregamento de imagens otimizado) -------

  const generatePreview = useCallback(async () => {
    if (!contentRef.current) return
    setLoading(true);

    const element = contentRef.current
    const SCALE = Math.min(3, Math.max(2, Math.ceil(window.devicePixelRatio || 2)));
    
    const opt = {
      html2canvas: { scale: SCALE },
      jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' },
      margin: [12, 0, 0, 0],
      pagebreak: {
        mode: ['css'],
        avoid: '.scene-selector'
      }
    }

    const pdfBlob = await html2pdf()
      .from(element)
      .set(opt)
      .toPdf()
      .output('blob')

    const url = URL.createObjectURL(pdfBlob)
    setPreviewUrl(url)
    setLoading(false);
    return () => previewUrl && URL.revokeObjectURL(previewUrl)
  }, [contentRef]);

  useEffect(() => {
    if (Object.keys(base64Map).length > 0) {
      generatePreview();
    }
  }, [base64Map, generatePreview]);

  return (
    <div style={{ width: '100%', height: 'calc(100vh - 220px)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
        {loading ?
          <Image src="/loading.svg" alt="Carregando" width={48} height={48} />
          :
          <>
            {previewUrl &&
              (
                <iframe
                  src={previewUrl}
                  title="Preview do PDF"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              )
            }
            {isDataEmpty && <div>Adicione cenas ao roteiro para visualizar o preview.</div>}
          </>
        }
      </div>
      <div ref={contentRef} style={{ padding: "0 16px 16px 16px" }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span style={{ fontSize: '18px' }}>ROTEIRO</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid rgb(180, 180, 180)', borderRadius: '8px' }}>
            <div style={cellStyle}><strong>Projeto</strong></div>
            <div style={cellStyle}>{projectName}</div>
            <div style={cellStyle}><strong>Data de exportação</strong></div>
            <div style={cellStyle}>{exportDate}</div>
          </div>
          {data?.script?.map((script, id) => (
            <div key={id} className='scene-selector' style={{ border: '1px solid rgb(200, 200, 200)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTopLeftRadius: '8px', borderTopRightRadius: '8px', backgroundColor: 'rgb(231, 231, 231)', padding: '12px 16px', fontSize: '16px', lineHeight: '18px', color: 'rgb(14, 11, 25)' }}>{script.name}</div>
              {script.activeFields.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 0' }}>
                  <span>Essa cena não contém <b>elementos</b>!</span>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '16px', padding: '16px' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {script.activeFields.includes('description') && views['description-view'] === 'show' && (
                      <div style={inputBoxStyle}>
                        <Image src="/description-active.svg" alt="Descrição" width={18} style={iconStyle} />
                        <ScriptInput readOnly placeholder="Descrição" value={script.description} onChange={() => { }} script={script} />
                      </div>
                    )}
                    {script.activeFields.includes('takes') && views['takes-view'] === 'show' && renderTakes(script, id, base64Map)}
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {script.activeFields.includes('audio') && views['audio-view'] === 'show' && (
                      <div style={inputBoxStyle}>
                        <Image src="/A-active.svg" alt="Áudio" width={18} style={iconStyle} />
                        <ScriptInput readOnly placeholder="Áudio" value={script.audio} onChange={() => { }} script={script} />
                      </div>
                    )}
                    {script.activeFields.includes('locution') && views['locution-view'] === 'show' && (
                      <div style={inputBoxStyle}>
                        <Image src="/locution-active.svg" alt="Locução" width={18} style={iconStyle} />
                        <ScriptInput readOnly placeholder="Locução" value={script.locution} onChange={() => { }} script={script} />
                      </div>
                    )}
                    {script.activeFields.includes('audios') && views['audios-view'] === 'show' && renderAudios(script, id)}
                    {script.activeFields.includes('audios') && views['audios-view'] === 'show' && script.timecodes.filter(t => t.type === 'AV').map((t, tid) => renderAV(t, tid, id, base64Map))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const cellStyle = {
  padding: '8px',
  border: '1px solid #ccc',
  fontSize: '14px',
  color: '#222',
};

const inputBoxStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
  padding: '12px',
  border: '0.5px solid rgb(200, 200, 200)',
  borderRadius: '8px',
};

const iconStyle = {
  width: '18px',
  height: '18px',
};

const renderTimecodeCard = (timecode, id, scriptId, type = null, base64Map = null) => {
  return (
    <div key={`${scriptId}-${id}`} style={{ border: '1px solid rgb(200, 200, 200)', borderRadius: '6px', }}>
      <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#fff', borderRadius: '6px' }}>
        {timecode.imageUrl && base64Map && (
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              backgroundColor: 'rgb(54, 54, 54)',
              borderTopLeftRadius: '4px',
              borderTopRightRadius: '4px',
              height: '100px',
              padding: '16px 0',
              overflow: 'hidden'
            }}
          >
            <img
              src={base64Map[timecode.id] || `http://localhost:4000${timecode.imageUrl}`}
              alt={`Thumbnail at ${timecode.inTime}`}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start', padding: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: "space-between", width: "100%", padding: '0 8px 0 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <p style={{ margin: 0, fontSize: '15px', lineHeight: '15px', fontWeight: '800', color: 'rgb(14, 11, 25)' }}>{id + 1}</p>
              <div style={{ width: '2px', height: '15px', backgroundColor: 'rgb(14, 11, 25)' }}></div>
              {timecode.type && <Image src={`/${typeToIcon(timecode.type)}`} alt="Type icon" width={18} style={{ display: 'block' }} />}
            </div>
            <div style={{ marginBottom: "6px" }}>
              <ReactStars
                value={timecode.rating}
                count={3}
                onChange={(newRating) => ratingChanged(timecode, newRating)}
                size={20}
                color1={"#b4b4b4"}
                color2={"#ffd700"}
              />
            </div>
          </div>
          {type !== "AV" && timecode.text &&
            <p
              style={{
                width: "calc(100% - 26px)",
                padding: "10px 8px 12px",
                margin: "0 16px 4px 4px",
                fontSize: "12px",
                lineHeight: "12px",
                fontWeight: 500,
                color: "rgb(14, 11, 25)",
                flexShrink: 1,
                backgroundColor: "rgb(231, 231, 231)",
                borderRadius: "6px",
                borderLeft: timecode.type === 'V'
                  ? '3px solid rgb(0, 40, 77)'
                  : timecode.type === 'A'
                    ? '3px solid rgb(44, 146, 128)'
                    : timecode.type === 'AV'
                      ? '3px solid rgb(146, 44, 44)'
                      : '0'
              }}
            >
              {timecode.text}
            </p>
          }
        </div>
        {type !== "AV" &&
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1px', padding: '0 16px', fontSize: '10px', fontWeight: '600', color: 'rgb(14, 11, 25)' }}>
            <span>{formatTimecode(timecode.inTime)}</span>
            <span>·</span>
            <span>{formatTimecode(timecode.outTime)}</span>
            <span>·</span>
            <span style={{ backgroundColor: 'black', color: 'white', padding: "1px 4px 2px", borderRadius: '2px' }}>{formatTimecode(timecode.duration)}</span>
          </div>
        }
        {type !== "AV" && timecode.mediaName && (
          <div style={{ textAlign: 'end', padding: '8px 16px 16px 16px', fontSize: '10px', fontWeight: '500', color: 'rgb(14, 11, 25)' }}>{timecode.mediaName}</div>
        )
        }
      </div>
    </div>
  );
};

const renderTakes = (script, id, base64Map) => {
  if (!script.timecodes?.length) return null;
  return (
    <div id={`grid-scripts-${id}`} style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(2, 1fr)' }}>
      {script.timecodes.map((tc, i) => renderTimecodeCard(tc, i, id, null, base64Map))}
    </div>
  );
};

const renderAV = (timecode, id, scriptId, base64Map) => {
  return (
    <div id={`grid-scripts-${id}`} key={`grid-scripts-${id}`} style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(2, 1fr)' }}>
      {renderTimecodeCard(timecode, id, scriptId, "AV", base64Map)}
    </div>
  );
};

const renderAudios = (script, id) => {
  if (!script.audios?.length) return null;
  return (
    <div id={`grid-audios-${id}`} style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(3, 1fr)' }}>
      {script.audios.map((audio, i) => renderTimecodeCard(audio, i, id, "A"))}
    </div>
  );
};

const typeToIcon = (type) => {
  if (type === 'V') return 'V-active.svg';
  if (type === 'A') return 'A-active.svg';
  if (type === 'AV') return 'AV-active.svg';
  if (type === 'image') return 'image-active.svg';
  return '';
};

export default HeaderScriptPreview;
