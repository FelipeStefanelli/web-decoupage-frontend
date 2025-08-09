import React, { useEffect, useState, useCallback } from "react";
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
  const [debouncedFilterText, setDebouncedFilterText] = useState("");
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [showFilter, setShowFilter] = useState(false);
  const { apiUrl } = useVisibility();

  useEffect(() => {
    setLoading(true);
    const loadImagesAsBase64 = async () => {
      const map = {};
      for (const timecode of data?.timecodes || []) {
        const url = `${apiUrl ? apiUrl : 'http://localhost:4000'}${timecode.imageUrl}`;
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
          map[timecode.id] = base64;
        } catch (e) {
          setLoading(false);
          console.warn(`Erro carregando imagem ${url}`, e);
        }
      }
      setBase64Map(map);
    };

    loadImagesAsBase64();
  }, [data]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedFilterText(filterText);
    }, 3500);

    return () => {
      clearTimeout(handler); // limpa o timer se o usuário digitar novamente antes de 5s
    };
  }, [filterText]);

  useEffect(() => {
    if (debouncedFilterText) {
      console.log("Executando filtro:", debouncedFilterText);
      generatePreview();
    }
  }, [debouncedFilterText]);

  const generatePreview = useCallback(async () => {
    if (!contentRef.current) return

    const element = contentRef.current
    const opt = {
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' },
      margin: [16, 0, 0, 0],
      pagebreak: {
        mode: ['css'],
        avoid: '.card-selector',
      }
    }

    // gera o blob em vez de salvar direto
    const pdfBlob = await html2pdf()
      .from(element)
      .set(opt)
      .toPdf()
      .output('blob')

    const url = URL.createObjectURL(pdfBlob)
    setPreviewUrl(url)
    setLoading(false);
    // libera URL antiga quando desmontar
    return () => previewUrl && URL.revokeObjectURL(previewUrl)
  }, [contentRef, debouncedFilterText, selectedTypes]);

  function groupArray(arr, size) {
    return arr.filter((t) => t.type).reduce((acc, _, i) => {
      if (i % size === 0) {
        acc.push(arr.slice(i, i + size));
      }
      return acc;
    }, []);
  }

  function filterArray(arr) {
    return arr.filter(tc => (!filterText || tc.text?.toLowerCase().includes(filterText.toLowerCase())) && (selectedTypes.length === 0 || selectedTypes.includes(tc.type)))
  }

  useEffect(() => {
    if (Object.keys(base64Map).length > 0) {
      generatePreview();
    }
  }, [base64Map, generatePreview]);

  const filtered = filterArray(data.timecodes);
  const grouped = groupArray(filtered, 3);
  console.log('grouped', grouped)
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
  return (
    <div style={{ width: '100%', height: 'calc(100vh - 196px)', overflow: 'hidden' }}>

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
          <p
            style={{
              fontSize: "16px",
              margin: "0 12px 0 0"
            }}
          >
            Filtros
          </p>
          <input
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
                <Image
                  aria-hidden
                  src={icon}
                  alt={alt}
                  width={19}
                  height={17}
                  style={{ width: "19px", height: "17px" }}
                />
              </button>
            ))}
          </div>
        </>
      </div>
      <div style={{ display: 'flex', width: '100%', height: 'calc(100% - 70px)' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
            <Image src="/loading.svg" alt="Carregando" width={48} height={48} />
          </div>
        ) : (
          <>
            {previewUrl && (
              <iframe
                src={`${previewUrl}#zoom=75`}
                title="Preview do PDF"
                style={{ width: '100%', height: 'calc(100%)', border: 'none' }}
              />
            )}
          </>
        )}
      </div>
      <div ref={contentRef} style={{ padding: "0 16px 16px 16px" }}>
        <div>
          <p style={{ margin: "0 8px 12px 8px", fontSize: "18px" }}>DECUPAGEM</p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              border: "1px solid #363636",
              borderRadius: "2px",
              margin: "0 8px",
            }}
          >
            <div style={cellStyle}><strong>Nome do projeto</strong></div>
            <div style={cellStyle}>{projectName}</div>
            <div style={cellStyle}><strong>Data de exportação</strong></div>
            <div style={cellStyle}>{exportDate}</div>
          </div>
          <div
            style={{
              padding: "12px 8px",
            }}
          >
            {grouped.map((group, groupId) => (
              <div
                key={`group-${groupId}`}
                className="card-selector"
                style={{
                  display: "flex",
                  gap: "12px",
                  paddingBottom: "12px"
                }}
              >
                {group.map((timecode, id) => (
                  <div
                    key={id}
                    style={{
                      border: "1px solid rgb(158, 158, 158)",
                      borderRadius: "6px",
                      flex: 1
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
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
                            padding: "2px 8px 8px",
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
                            {id + 1}
                            <div
                              style={{
                                width: "2px",
                                height: "15px",
                                backgroundColor: "rgb(14, 11, 25)",
                              }}
                            ></div>
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
                                width={18}
                                style={{ display: "block" }}
                              />
                            }
                          </div>
                          <ReactStars
                            value={timecode.rating}
                            count={3}
                            onChange={(newRating) => ratingChanged(timecode, newRating)}
                            size={20}
                            color1={"#b4b4b4"}
                            color2={"#ffd700"}
                          />
                        </div>
                        {timecode.text &&
                          <p
                            style={{
                              width: "calc(100% - 28px)",
                              padding: "10px 8px 12px",
                              margin: "2px 12px 4px 12px",
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
                          gap: "1px",
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
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const cellStyle = {
  padding: "8px",
  border: "1px solid #ccc",
  fontSize: "14px",
  color: "#222",
};

export default HeaderDecoupagePreview;
