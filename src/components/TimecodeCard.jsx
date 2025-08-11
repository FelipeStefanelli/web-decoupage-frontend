import React from 'react';
import { formatTimecode } from "@/utils/utils";
import CustomImage from "@/components/Image";
import TimecodeInput from "./TimecodeInput";
import TimecodeType from "./TimecodeType";
import ReactStars from "react-stars";
import { useVisibility } from '@/contexts/VisibilityContext';

const TimecodeCard = ({ id, timecode, updateTimecode, setActiveMenu, activeMenu, ratingChanged, type, views, cardType, projectName, fetchTimecodes, setIsDraggingOverTextarea, base64Map }) => {
    const { apiUrl } = useVisibility();
    const src =
        base64Map?.[timecode.id] ||
        `${apiUrl ? apiUrl : "http://localhost:4000"}${timecode.imageUrl}`;
    const deleteTimecode = async (id) => {
        const response = await fetch(`${apiUrl ? apiUrl : 'http://localhost:4000'}/api?projectName=${projectName}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        fetchTimecodes()
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
    }
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
                        position: 'relative',            // <— cria o contexto para os absolutely-positioned
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
                    <img
                        src={src}
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
            <div
                style={type !== 'audio' ?
                    {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingRight: "12px",
                        margin: "4px 0 8px 0",
                    }
                    :
                    {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingRight: "12px",
                        margin: "6px 0 12px 0",
                    }

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
                        <p
                            style={{
                                borderRadius: '2px',
                                padding: '2px',
                                color: 'rgb(18, 14, 35)',
                                fontWeight: '600',
                                lineHeight: '10px',
                                letterSpacing: '0.1px',
                                textAlign: 'center',
                                margin: 0
                            }}
                        >
                            {formatTimecode(timecode.inTime)}
                        </p>
                        ·
                        <p
                            style={{
                                borderRadius: '2px',
                                padding: '2px',
                                color: 'rgb(18, 14, 35)',
                                fontWeight: '600',
                                lineHeight: '10px',
                                letterSpacing: '0.1px',
                                textAlign: 'center',
                                margin: 0
                            }}
                        >
                            {formatTimecode(timecode.outTime)}
                        </p>
                        ·
                        <p
                            style={{
                                borderRadius: '4px',
                                padding: '4px',
                                backgroundColor: 'rgb(18, 14, 35)',
                                color: 'white',
                                fontWeight: '600',
                                lineHeight: '10px',
                                letterSpacing: '0.1px',
                                textAlign: 'center',
                                margin: 0
                            }}
                        >
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
                            alt="Trash icon"
                            width={18}
                            height={18}
                            style={{ width: "18px", height: "18px", cursor: "pointer" }}
                            onClick={async () => {
                                const textContent = timecode.mediaName;
                                try {
                                    await navigator.clipboard.writeText(textContent); // Usando a Clipboard API para copiar o texto
                                    alert('Texto copiado para a área de transferência!');
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
