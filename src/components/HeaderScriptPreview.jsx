import { useState, useEffect, useCallback } from 'react';
import Image from '@/components/Image';
import ScriptInput from '@/components/ScriptInput';
import { formatTimecode } from '@/utils/utils';
import html2pdf from 'html2pdf.js'
import { useVisibility } from '@/contexts/VisibilityContext';

const HeaderScriptPreview = ({ contentRef, data, projectName, exportDate, views }) => {
  const [previewUrl, setPreviewUrl] = useState(null)
  const [base64Map, setBase64Map] = useState({});
  const { apiUrl } = useVisibility();
  useEffect(() => {
    const loadImages = async () => {
      const map = {};
      for (const scene of data?.script || []) {
        for (const tc of scene.timecodes || []) {
          if (!tc.imageUrl) continue;
          const url = `${apiUrl ? apiUrl : 'http://localhost:4000'}${tc.imageUrl}`;
          try {
            const res = await fetch(url, {
              method: 'GET',
              headers: {
                  'ngrok-skip-browser-warning': '1',
                  'Accept': 'application/json'
              }
            });
            const blob = await res.blob();
            const reader = new FileReader();
            const base64 = await new Promise((resolve) => {
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            });
            map[tc.id] = base64;
          } catch (e) {
            console.warn("Erro carregando imagem", url, e);
          }
        }
      }
      setBase64Map(map);
    };
    loadImages();
    setTimeout(() => {
      generatePreview();
    }, 500);
  }, [data]);
  

const generatePreview = useCallback(async () => {
    if (!contentRef.current) return

    const element = contentRef.current
    const opt = {
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css','legacy'], before: ['.page-break-avoid'], avoid: ['.page-break-avoid'] }
    }

    // gera o blob em vez de salvar direto
    const pdfBlob = await html2pdf()
      .from(element)
      .set(opt)
      .toPdf()
      .output('blob')

    const url = URL.createObjectURL(pdfBlob)
    setPreviewUrl(url)
    // libera URL antiga quando desmontar
    return () => previewUrl && URL.revokeObjectURL(previewUrl)
  }, [contentRef])
  const changeScene = (script, field, isValueChange, value) => {
      if (isValueChange) {
          script[field] = value;
          updateTimecode(null, 'script', script);
      } else {
          const hasField = script.activeFields.includes(field);
          if (hasField) {
              script.activeFields = script.activeFields.filter(item => item !== field)
          } else {
              script.activeFields.push(field);
          }
      }
      updateTimecode(null, 'script', script);
  };
  return (
    <>
      {previewUrl && (
        <iframe
          src={previewUrl}
          title="Preview do PDF"
          style={{ width: '100%', height: '80vh', border: 'none' }}
        />
      )}
      <div ref={contentRef} className="page-break-avoid">
        <div style={{ padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span style={{ fontSize: '18px' }}>ROTEIRO</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid rgb(180, 180, 180)', borderRadius: '8px' }}>
            <div style={cellStyle}><strong>Nome do projeto</strong></div>
            <div style={cellStyle}>{projectName}</div>
            <div style={cellStyle}><strong>Data de exportação</strong></div>
            <div style={cellStyle}>{exportDate}</div>
          </div>
          {data?.script?.map((script, id) => (
            <div key={id} style={{ border: '1px solid rgb(200, 200, 200)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTopLeftRadius: '8px', borderTopRightRadius: '8px', backgroundColor: 'rgb(231, 231, 231)', padding: '12px 16px', fontSize: '16px', lineHeight: '18px', color: 'rgb(14, 11, 25)' }}>{script.name}</div>
              {script.activeFields.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 0' }}>
                  <span>Adicione <b>elementos</b> na cena e comece sua história!</span>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '16px', padding: '16px' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {script.activeFields.includes('description') && views['description-view'] === 'show' && (
                      <div style={inputBoxStyle}>
                        <Image src="/description-active.svg" alt="Descrição" width={18} height={18} style={iconStyle} />
                        <ScriptInput readOnly placeholder="Descrição" value={script.description} onChange={(value) => changeScene(script, 'description', true, value)} script={script} />
                      </div>
                    )}
                    {script.activeFields.includes('takes') && views['takes-view'] === 'show' && renderTakes(script, id, base64Map)}
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {script.activeFields.includes('audio') && views['audio-view'] === 'show' && (
                      <div style={inputBoxStyle}>
                        <Image src="/A-active.svg" alt="Áudio" width={18} height={18} style={iconStyle} />
                        <ScriptInput readOnly placeholder="Áudio" value={script.audio} onChange={(value) => changeScene(script, 'audio', true, value)} script={script} />
                      </div>
                    )}
                    {script.activeFields.includes('locution') && views['locution-view'] === 'show' && (
                      <div style={inputBoxStyle}>
                        <Image src="/locution-active.svg" alt="Locução" width={18} height={18} style={iconStyle} />
                        <ScriptInput readOnly placeholder="Locução" value={script.locution} onChange={(value) => changeScene(script, 'locution', true, value)} script={script} />
                      </div>
                    )}
                    {script.activeFields.includes('audios') && views['audios-view'] === 'show' && renderAudios(script, id)}
                    {script.timecodes.filter(t => t.type === 'AV').map((t, tid) => renderAV(t, tid, id, base64Map))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: '#fff', borderRadius: '6px' }}>
        {timecode.imageUrl && base64Map && (
          <div
            style={{
                position: 'relative',            // <— cria o contexto para os absolutely-positioned
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
            {/* img RECEBE z-index maior para ficar por cima das linhas */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 8px 0 0', fontSize: '15px', fontWeight: '800', color: 'rgb(14, 11, 25)' }}>
            {id + 1}
            <div style={{ width: '2px', height: '15px', backgroundColor: 'rgb(14, 11, 25)' }}></div>
            {timecode.type && <Image src={`/${typeToIcon(timecode.type)}`} alt="Type icon" width={18} height={17} style={{ display: 'block' }} />}
          </div>
          {type !== "AV" && <span style={{ fontSize: '12px', fontWeight: '500', color: 'rgb(14, 11, 25)' }}>{timecode.text}</span>}
        </div>
        {type !== "AV" &&
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1px', padding: '4px 16px 8px 16px', fontSize: '10px', fontWeight: '600', color: 'rgb(14, 11, 25)' }}>
            <span>{formatTimecode(timecode.inTime)}</span>
            <span>·</span>
            <span>{formatTimecode(timecode.outTime)}</span>
            <span>·</span>
            <span style={{ backgroundColor: 'black', color: 'white', padding: '0 4px', borderRadius: '2px' }}>{formatTimecode(timecode.duration)}</span>
          </div>
        }
        <div style={{ textAlign: 'end', padding: '8px 16px 8px 16px', fontSize: '10px', fontWeight: '500', color: 'rgb(14, 11, 25)' }}>
          {timecode.id.split('-')[0] + '-' + timecode.id.split('-')[1] + '-' + timecode.id.split('-')[2] + '-' + timecode.id.split('-')[3]}
        </div>
        {type !== "AV" && timecode.videoName && (
            <div style={{ textAlign: 'end', padding: '8px 16px 16px 16px', fontSize: '10px', fontWeight: '500', color: 'rgb(14, 11, 25)' }}>{timecode.videoName}</div>
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
    <div id={`grid-scripts-${id}`} style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(2, 1fr)' }}>
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