import React from 'react';
import Image from "@/components/Image";

const TimecodeType = ({ id, timecode, setActiveMenu, updateTimecode, activeMenu, readOnly, cardType }) => {
    const handleIdClick = (id) => {
        setActiveMenu((prev) => (prev === id ? null : id));
    };

    const handleOptionClick = (timecode, option) => {
        setActiveMenu(null);
        const updatedTimecode = { ...timecode, type: option };
        updateTimecode(updatedTimecode);
    };
    return (
        <div
            style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                margin: "6px 0 4px",
                height: cardType === 'script' ? "24px" : "28px",
                borderTopRightRadius: activeMenu || !timecode.type ? "0" : "4px",
                borderBottomRightRadius: activeMenu || !timecode.type ? "0" : "4px",
                backgroundColor: timecode.type === "V" ? "rgba(221, 229, 236, 1)"
                    : timecode.type === "A" ? "rgba(207, 227, 227, 1)"
                        : timecode.type === "AV" ? "rgba(240, 223, 223, 1)"
                            : "white"

            }}
        >
            <span
                onClick={() => !readOnly && timecode.type !== 'image' && handleIdClick(timecode.id)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: readOnly || timecode.type === 'image' ? "text" : "pointer",
                    color: "rgba(158, 156, 168, 1)",
                    padding: "0 7px",
                    fontSize: cardType === 'script' ? "12px" : "13px",
                    lineHeight: "11px",
                    fontWeight: "800",
                    borderTop: "1px solid rgba(158, 156, 168, 1)",
                    borderRight: "1px solid rgba(158, 156, 168, 1)",
                    borderBottom: "1px solid rgba(158, 156, 168, 1)",
                    userSelect: "none",
                    margin: 0,
                    height: cardType === 'script' ? "24px" : "28px",
                    boxSizing: 'border-box',
                    pointerEvents: readOnly ? 'none' : 'auto'
                }}
            >
                {id + 1}
            </span>
            {timecode.type && activeMenu !== timecode.id && (
                <span style={{
                    height: cardType === 'script' ? "24px" : "28px",
                    borderTop: "1px solid rgba(158, 156, 168, 1)",
                    borderBottom: "1px solid rgba(158, 156, 168, 1)",
                    borderRight: "1px solid rgba(158, 156, 168, 1)",
                    borderTopRightRadius: "4px",
                    borderBottomRightRadius: "4px",
                    boxSizing: 'border-box',
                }}>
                    {timecode.type === "V" ?
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                height: "calc(100% - 12px)",
                                padding: "6px",
                                cursor: readOnly ? "text" : "pointer",
                                userSelect: "none",
                            }}
                        >
                            <Image
                                aria-hidden
                                src="/V.svg"
                                alt="Vídeo icon"
                                width={cardType === 'script' ? 14 : 16}
                                height={cardType === 'script' ? 15 : 17}
                                style={{ width: cardType === 'script' ? "14px" : "16px", height: cardType === 'script' ? "15px" : "17px" }}
                            />
                        </div>
                        : timecode.type === "A" ?
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    height: "calc(100% - 12px)",
                                    padding: "6px",
                                    cursor: readOnly ? "text" : "pointer",
                                    userSelect: "none",
                                }}
                            >
                                <Image
                                    aria-hidden
                                    src="/A.svg"
                                    alt="Áudio icon"
                                    width={cardType === 'script' ? 14 : 16}
                                    height={cardType === 'script' ? 15 : 17}
                                    style={{ width: cardType === 'script' ? "14px" : "16px", height: cardType === 'script' ? "15px" : "17px" }}
                                />
                            </div>
                            : timecode.type === "AV" ?
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        height: "calc(100% - 12px)",
                                        padding: "6px",
                                        cursor: readOnly ? "text" : "pointer",
                                        userSelect: "none",
                                    }}
                                >
                                    <Image
                                        aria-hidden
                                        src="/AV.svg"
                                        alt="AV icon"
                                        width={cardType === 'script' ? 14 : 16}
                                        height={cardType === 'script' ? 15 : 17}
                                        style={{ width: cardType === 'script' ? "14px" : "16px", height: cardType === 'script' ? "15px" : "17px" }}
                                    />
                                </div>
                                : timecode.type === "image" ?
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            height: "calc(100% - 12px)",
                                            padding: "6px",
                                            cursor: readOnly ? "text" : "pointer",
                                            userSelect: "none",
                                        }}
                                    >
                                        <Image
                                            aria-hidden
                                            src="/image.svg"
                                            alt="Image icon"
                                            width={cardType === 'script' ? 14 : 16}
                                            height={cardType === 'script' ? 15 : 17}
                                            style={{ width: cardType === 'script' ? "14px" : "16px", height: cardType === 'script' ? "15px" : "17px" }}
                                        />
                                    </div>
                                    :
                                    null
                    }
                </span>
            )}
            {(activeMenu === timecode.id || !timecode.type) && !readOnly && (
                <div
                    style={{
                        height: cardType === 'script' ? "24px" : "28px",
                        width: "96px",
                        display: "flex",
                        backgroundColor: "white"
                    }}
                >
                    <div
                        onClick={() => handleOptionClick(timecode, "V")}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            height: "100%",
                            padding: "6px",
                            cursor: "pointer",
                            userSelect: "none",
                            borderTop: "1px solid rgba(158, 156, 168, 1)",
                            borderBottom: "1px solid rgba(158, 156, 168, 1)",
                            borderRight: "1px solid rgba(158, 156, 168, 1)",
                            boxSizing: 'border-box',
                        }}
                    >
                        <Image
                            aria-hidden
                            src="/V.svg"
                            alt="Vídeo icon"
                            width={16}
                            height={15}
                            style={{ width: "16px", height: "15px" }}
                        />
                    </div>
                    <div
                        onClick={() => handleOptionClick(timecode, "A")}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            height: "100%",
                            padding: "6px",
                            cursor: "pointer",
                            userSelect: "none",
                            borderTop: "1px solid rgba(158, 156, 168, 1)",
                            borderBottom: "1px solid rgba(158, 156, 168, 1)",
                            borderRight: "1px solid rgba(158, 156, 168, 1)",
                            boxSizing: 'border-box',
                        }}
                    >
                        <Image
                            aria-hidden
                            src="/A.svg"
                            alt="Áudio icon"
                            width={16}
                            height={15}
                            style={{ width: "16px", height: "15px" }}
                        />
                    </div>
                    <div
                        onClick={() => handleOptionClick(timecode, "AV")}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            height: "100%",
                            padding: "6px",
                            cursor: "pointer",
                            userSelect: "none",
                            borderTop: "1px solid rgba(158, 156, 168, 1)",
                            borderBottom: "1px solid rgba(158, 156, 168, 1)",
                            borderRight: "1px solid rgba(158, 156, 168, 1)",
                            borderTopRightRadius: "4px",
                            borderBottomRightRadius: "4px",
                            boxSizing: 'border-box',
                        }}
                    >
                        <Image
                            aria-hidden
                            src="/AV.svg"
                            alt="AV icon"
                            width={16}
                            height={15}
                            style={{ width: "16px", height: "15px" }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default TimecodeType;


