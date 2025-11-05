import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Image from "@/components/Image";
import { formatTimecode } from "@/utils/utils";
import { useVisibility } from '@/contexts/VisibilityContext';
import html2pdf from 'html2pdf.js';
import ReactStars from "react-stars";

const HeaderDecoupagePreview = ({ contentRef, data, projectName, exportDate }) => {
  const [base64Map, setBase64Map] = useState({});
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [isDataEmpty, setIsDataEmpty] = useState(false);

  const { apiUrl } = useVisibility();
  const blobUrlCache = useRef(new Map());
  const iframeRef = useRef(null);

  // ---------- helpers imagem ----------
  async function downscaleImage(blob, maxH) {
    let bmp = null;
    try { bmp = await createImageBitmap(blob); } catch { bmp = null; }

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
        } catch (err) { reject(err); }
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

  // ---------- carregar thumbs ----------
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const loadImagesAsBlobUrls = async () => {
      const map = {};
      const timecodes = data?.timecodes || [];

      if (!timecodes.length) {
        if (!cancelled) {
          setIsDataEmpty(true);
          setBase64Map({});
          setLoading(false);
        }
        return;
      }
      setIsDataEmpty(false);

      const pool = 6;
      let i = 0;

      async function worker() {
        while (i < timecodes.length) {
          const idx = i++;
          const t = timecodes[idx];
          if (!t?.imageUrl || !t?.id) continue;

          const fullUrl = `${apiUrl ? apiUrl : 'http://localhost:4000'}${t.imageUrl}`;
          try {
            if (blobUrlCache.current.has(t.id)) {
              const cached = blobUrlCache.current.get(t.id);
              if (cached) map[t.id] = cached;
              continue;
            }
            const res = await fetch(fullUrl, {
              method: 'GET',
              headers: { 'ngrok-skip-browser-warning': '1', 'Accept': 'image/*' }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const blob = await res.blob();
            const compressed = await downscaleImage(blob, 900);
            const url = URL.createObjectURL(compressed);

            blobUrlCache.current.set(t.id, url);
            map[t.id] = url;
          } catch (e) {
            console.warn(`Erro carregando imagem ${fullUrl}`, e);
          }
        }
      }

      await Promise.all(Array.from({ length: pool }, worker));
      if (!cancelled) {
        setBase64Map(map);
        setLoading(false);
      }
    };

    loadImagesAsBlobUrls();
    return () => { cancelled = true; };
  }, [data, apiUrl]);

  // ---------- gerar PDF ----------
  const generatePreview = useCallback(async () => {
    if (!contentRef.current) return;
    setLoading(true);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    const element = contentRef.current;
    const SCALE = Math.min(3, Math.max(2, Math.ceil(window.devicePixelRatio || 2)));

    const opt = {
      html2canvas: { scale: SCALE },
      jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' },
      margin: [12, 0, 0, 0],
      pagebreak: { mode: ['css'], avoid: '.card-selector' }
    };

    const pdfBlob = await html2pdf()
      .from(element)
      .set(opt)
      .toPdf()
      .output('blob');

    const url = URL.createObjectURL(pdfBlob);
    setPreviewUrl(url);
    setLoading(false);
  }, [contentRef, previewUrl]);

  useEffect(() => {
    if (Object.keys(base64Map).length > 0) generatePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base64Map]);

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  // ---------- filtros / agrupamento ----------
  function groupArray(arr, size) {
    const filteredByType = arr.filter((t) => t.type);
    const out = [];
    for (let i = 0; i < filteredByType.length; i += size) {
      out.push(filteredByType.slice(i, i + size));
    }
    return out;
  }

  function filterArray(arr) {
    return arr.filter(tc =>
      (!filterText || tc.text?.toLowerCase().includes(filterText.toLowerCase())) &&
      (selectedTypes.length === 0 || selectedTypes.includes(tc.type))
    );
  }

  const filtered = useMemo(() => filterArray(data.timecodes || []), [data.timecodes, filterText, selectedTypes]);
  const grouped = useMemo(() => groupArray(filtered, 3), [filtered]);

  // ---------- render ----------
  return (
    <div style={{ width: '100%', height: 'calc(100vh - 196px)', overflow: 'hidden' }}>

      {/* barra de filtros (fora do PDF, mantida) */}
      <div
        style={{
          padding: '16px',
          backgroundColor: "rgba(231, 231, 231)",
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          border: '2px solid rgb(158, 156, 168)'
        }}
      >
        <>
          <p style={{ fontSize: "16px", margin: "0 12px 0 0" }}>Filtros</p>
          <input
            name="text-filter"
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filtrar por texto"
            style={{
              padding: '7px 12px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              flex: '1',
              minWidth: '180px',
              outline: 'none'
            }}
          />

          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { type: 'A', icon: '/A.svg', alt: 'Áudio' },
              { type: 'V', icon: '/V.svg', alt: 'Vídeo' },
              { type: 'AV', icon: '/AV.svg', alt: 'Áudio-Vídeo' }
            ].map(({ type, icon, alt }) => (
              <button
                key={type}
                onClick={() =>
                  setSelectedTypes(prev =>
                    prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
                  )
                }
                style={{
                  padding: '5px',
                  borderRadius: '4px',
                  border: selectedTypes.includes(type) ? '2px solid #c4302b' : '1px solid #ccc',
                  backgroundColor: selectedTypes.includes(type) ? '#fbecec' : '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  boxSizing: 'border-box'
                }}
                title={alt}
              >
                <Image aria-hidden src={icon} alt={alt} width={19} height={17} style={{ width: 19, height: 17 }} />
              </button>
            ))}
          </div>
          <button
            onClick={() => generatePreview()}
            style={{
              padding: "6px 12px",
              backgroundColor: "rgb(196, 48, 43)",
              fontWeight: "500",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Aplicar
          </button>
        </>
      </div>

      {/* área de preview (fora do PDF, mantida) */}
      <div style={{ display: 'flex', width: '100%', height: 'calc(100% - 70px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
          {loading ? (
            <Image src="/loading.svg" alt="Carregando" width={48} height={48} />
          ) : (
            <>
              {previewUrl &&
                <iframe
                  ref={iframeRef}
                  src={`${previewUrl}#zoom=page-width`}
                  title="Preview do PDF"
                  style={{ width: '100%', height: 'calc(100%)', border: 'none' }}
                />
              }
              {isDataEmpty && <div>Adicione timecodes a decupagem para visualizar o preview.</div>}
            </>
          )}
        </div>
      </div>

      {/* =========================
           AQUI começa o CONTEÚDO do PDF (APENAS esta parte foi redesenhada)
           ========================= */}
      <div
        ref={contentRef}
        style={{
          background: "#f3f4f6",               // fundo neutro (não imprime no PDF, pq só a "página" é branca)
          fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
          color: "#111827"
        }}
      >
        {/* “Página” branca centralizada com cara de papel */}
        <div
          style={{
            width: "794px",                    // ~A4 em px @96dpi
            margin: "0 auto",
            background: "#fff",
            borderRadius: "12px",
            overflow: "hidden"
          }}
        >
          {/* Cabeçalho da decupagem */}
          <div style={{ padding: "24px 28px 12px", borderBottom: "2px solid #e5e7eb" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16 }}>
              <h1 style={{ fontSize: 22, lineHeight: "26px", margin: 0, letterSpacing: ".3px" }}>DECUPAGEM</h1>
              {/**<span style={{ fontSize: 12, color: "#6b7280" }}>{exportDate}</span>**/}
            </div>

            {/* Metadados bonitos */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginTop: 12,
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: "10px 12px"
              }}
            >
              <div style={{ fontSize: 12, color: "#6b7280" }}>Projeto</div>
              <div style={{ fontSize: 12, color: "#111827", fontWeight: 600 }}>{projectName}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Exportado por</div>
              <div style={{ fontSize: 12, color: "#111827", fontWeight: 600 }}>Sara Augusto</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Data de exportação</div>
              <div style={{ fontSize: 12, color: "#111827", fontWeight: 600 }}>{exportDate}</div>
            </div>
          </div>

          {/* Seção dos CARDS (não alterados), com grid responsiva para 3 colunas */}
          <div style={{ padding: "16px 20px 24px" }}>
            {grouped.map((group, groupId) => (
              <div
                key={`group-${groupId}`}
                className="card-selector"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "12px",
                  paddingTop: "12px",
                  pageBreakInside: "avoid",     // evita quebra do bloco entre páginas
                  breakInside: "avoid"
                }}
              >
                {group.map((timecode, id) => (
                  <div
                    key={id}
                    style={{
                      border: "1px solid rgb(158, 158, 158)",
                      borderRadius: "6px",
                      flex: 1,
                      background: "#fff"
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                        backgroundColor: "#fff",
                        borderRadius: "6px",
                      }}
                    >
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
                          loading="lazy"
                          src={base64Map[timecode.id] || `${apiUrl ? apiUrl : 'http://localhost:4000'}${timecode.imageUrl}`}
                          alt={`Timecode ${timecode.inTime}- ${timecode.outTime}`}
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

                      {/* ======= CARDS (conteúdo interno inalterado) ======= */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: 'column',
                          alignItems: "flex-start",
                          justifyContent: "flex-start",
                          padding: "0 16px 8px 0",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            width: "100%",
                            padding: "0px 8px 8px",
                            fontSize: "15px",
                            fontWeight: 800,
                            color: "rgb(14, 11, 25)",
                            flexShrink: 0,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "6px",
                            }}
                          >
                            <span style={{ margin: "0 0 3px 0", fontSize: "13px", lineHeight: "13px", fontWeight: '800', color: 'rgb(14, 11, 25)' }}>{id + 1}</span>
                            <div style={{ width: "2px", height: "12px", backgroundColor: "rgb(14, 11, 25)" }} />
                            {timecode.type !== "" &&
                              <Image
                                src={
                                  timecode.type === "V"
                                    ? "/V-active.svg"
                                    : timecode.type === "A"
                                      ? "/A-active.svg"
                                      : timecode.type === "AV"
                                        ? "/AV-active.svg"
                                        : timecode.type === "image"
                                          ? "/image-active.svg"
                                          : ""
                                }
                                alt="Type icon"
                                width={16}
                                style={{ display: "block" }}
                              />
                            }
                          </div>
                          <div style={{ marginBottom: "4px" }}>
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

                        {timecode.text &&
                          <p
                            style={{
                              width: "calc(100% - 28px)",
                              padding: "10px 8px 12px",
                              margin: "0 12px 4px 12px",
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

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          gap: "2px",
                          padding: "0 16px",
                          fontSize: "10px",
                          fontWeight: 600,
                          color: "rgb(14, 11, 25)",
                        }}
                      >
                        <span>{formatTimecode(timecode.inTime)}</span>
                        <span>·</span>
                        <span>{formatTimecode(timecode.outTime)}</span>
                        <span>·</span>
                        <span
                          style={{
                            backgroundColor: "black",
                            color: "white",
                            padding: "1px 4px 2px",
                            borderRadius: "2px",
                          }}
                        >
                          {formatTimecode(timecode.duration)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', width: 'calc(100% - 32px)', padding: '8px 16px 12px 16px' }}>
                        <p
                          style={{
                            fontSize: '10px',
                            fontWeight: '500',
                            lineHeight: '12px',
                            letterSpacing: '0.1px',
                            textAlign: 'end',
                            color: 'black',
                            maxWidth: '160px',
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
                      {/* ======= fim dos CARDS (inalterados) ======= */}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        {/* fim da “página” */}
      </div>
      {/* =========================
           FIM do conteúdo do PDF
           ========================= */}
    </div>
  );
};

const renderFilename = (filename, maxLength = 20) => {
  if (!filename) return "";
  const dotIndex = filename.lastIndexOf(".");
  const hasExtension = dotIndex !== -1;
  const name = hasExtension ? filename.slice(0, dotIndex) : filename;
  const ext = hasExtension ? filename.slice(dotIndex) : "";
  if (filename.length <= maxLength) return filename;
  const allowedNameLength = maxLength - ext.length - 3;
  const shortName = name.slice(0, allowedNameLength);
  return `${shortName}..${ext}`;
};

export default HeaderDecoupagePreview;
