import React, { useEffect, useState } from "react";
import Image from "@/components/Image";
import { formatTimecode } from "@/utils/utils";

const HeaderDecoupagePreview = ({ contentRef, data, projectName, exportDate }) => {
  const [base64Map, setBase64Map] = useState({});

  useEffect(() => {
    console.log(data)
    const loadImagesAsBase64 = async () => {
      const map = {};
      for (const timecode of data?.timecodes || []) {
        const url = `http://localhost:4000${timecode.imageUrl}`;
        try {
          const res = await fetch(url);
          const blob = await res.blob();
          const reader = new FileReader();
          const base64 = await new Promise((resolve) => {
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
          map[timecode.id] = base64;
        } catch (e) {
          console.warn(`Erro carregando imagem ${url}`, e);
        }
      }
      setBase64Map(map);
    };
  
    loadImagesAsBase64();
  }, [data]);

  const renderFilename = (filename, maxLength = 20) => {
      if (!filename) return '';
    
      const dotIndex = filename.lastIndexOf('.');
      const hasExtension = dotIndex !== -1;
      const name = hasExtension ? filename.slice(0, dotIndex) : filename;
      const ext = hasExtension ? filename.slice(dotIndex) : '';
    
      // Se for curto o suficiente, retorna o nome todo
      if (filename.length <= maxLength) return filename;
    
      const allowedNameLength = maxLength - ext.length - 3; // 3 for '...'
      const shortName = name.slice(0, allowedNameLength);
    
      return `${shortName}..${ext}`;
  };

  return (
    <div ref={contentRef} className="page-break-avoid fade-in">
      <div style={{ overflow: "auto", maxHeight: "calc(100vh - 200px)" }}>
        <div>
          <p style={{ margin: "12px 8px", fontSize: "18px" }}>DECUPAGEM</p>
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
              display: "grid",
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: "12px",
            }}
          >
            {data?.timecodes?.filter((t) => t.type).map((timecode, id) => (
              <div
                key={id}
                style={{
                  border: "1px solid rgb(158, 158, 158)",
                  borderRadius: "6px",
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
                        gap: "6px",
                        padding: "7px 8px",
                        fontSize: "15px",
                        fontWeight: 800,
                        color: "rgb(14, 11, 25)",
                        flexShrink: 0,
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
                          height={18}
                          style={{ display: "block" }}
                        />
                      }
                    </div>
                    <span
                      style={{
                        padding: "7px 8px",
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "rgb(14, 11, 25)",
                        flexShrink: 1,
                      }}
                    >
                      {timecode.text}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: "1px",
                      padding: "2px 16px",
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
                        padding: "0 4px",
                        borderRadius: "2px",
                      }}
                    >
                      {formatTimecode(timecode.duration)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', width: 'calc(100% - 32px)', padding: '12px 16px 12px 16px' }}>
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
                          title={timecode.videoName}
                          >
                          {renderFilename(timecode.videoName)}
                      </p>
                  </div>
                </div>
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