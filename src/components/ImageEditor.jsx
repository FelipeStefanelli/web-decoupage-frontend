import React, { useRef, useState, useEffect } from "react";
import {
  FaUndo,
  FaRedo,
  FaArrowsAltH,
  FaSearchPlus,
  FaSearchMinus,
  FaTrash,
  FaCheck,
} from "react-icons/fa";

const ControlButton = ({ onClick, tooltip, icon }) => (
  <button
    title={tooltip}
    onClick={onClick}
    style={{
      background: "transparent",
      border: "none",
      cursor: "pointer",
      padding: "8px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 20,
      color: "#333",
    }}
  >
    {icon}
  </button>
);

const ImageEditorCanvas = ({ imageSrc, onApplyCrop }) => {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  const [rotation, setRotation] = useState(0);
  const [scaleX, setScaleX] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [selection, setSelection] = useState(null);
  const [action, setAction] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [resizeCorner, setResizeCorner] = useState(null);

  useEffect(() => {
    drawImage();
  }, [imageSrc, rotation, scaleX, zoom, selection]);

  const drawImage = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = imgRef.current;
    if (!canvas || !ctx || !img) return;

    const { width, height } = img;
    canvas.width = width;
    canvas.height = height;

    ctx.save();
    ctx.clearRect(0, 0, width, height);
    ctx.translate(width / 2, height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scaleX * zoom, zoom);
    ctx.drawImage(img, -width / 2, -height / 2);
    ctx.restore();

    if (selection) {
      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = "red";
      ctx.lineWidth = 2;
      ctx.strokeRect(selection.x, selection.y, selection.w, selection.h);
      ctx.setLineDash([]);
    }
  };

  const getMousePos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const isInSelection = (pos) => {
    if (!selection) return false;
    return (
      pos.x >= selection.x &&
      pos.x <= selection.x + selection.w &&
      pos.y >= selection.y &&
      pos.y <= selection.y + selection.h
    );
  };

  const getResizeZone = (pos, selection, threshold = 10) => {
    if (!selection) return null;
    const { x, y, w, h } = selection;

    const left = pos.x >= x - threshold && pos.x <= x + threshold;
    const right = pos.x >= x + w - threshold && pos.x <= x + w + threshold;
    const top = pos.y >= y - threshold && pos.y <= y + threshold;
    const bottom = pos.y >= y + h - threshold && pos.y <= y + h + threshold;

    if (top && left) return 'nw';
    if (top && right) return 'ne';
    if (bottom && left) return 'sw';
    if (bottom && right) return 'se';
    if (top) return 'n';
    if (bottom) return 's';
    if (left) return 'w';
    if (right) return 'e';
    return null;
  };

  const handleMouseDown = (e) => {
    const pos = getMousePos(e);
    const zone = getResizeZone(pos, selection);

    if (zone) {
      setResizeCorner(zone);
      setAction("resizing");
      return;
    }

    if (isInSelection(pos)) {
      setOffset({ x: pos.x - selection.x, y: pos.y - selection.y });
      setAction("moving");
    } else {
      setSelection({ x: pos.x, y: pos.y, w: 0, h: 0 });
      setAction("drawing");
    }
  };

  const handleMouseMove = (e) => {
    const pos = getMousePos(e);
    const canvas = canvasRef.current;

    if (action === "drawing") {
      setSelection((prev) => ({
        ...prev,
        w: pos.x - prev.x,
        h: pos.y - prev.y,
      }));
    } else if (action === "moving") {
      setSelection((prev) => {
        const newX = Math.max(0, Math.min(canvas.width - prev.w, pos.x - offset.x));
        const newY = Math.max(0, Math.min(canvas.height - prev.h, pos.y - offset.y));
        return { ...prev, x: newX, y: newY };
      });
    } else if (action === "resizing") {
      setSelection((prev) => {
        if (!prev) return prev;
        let { x, y, w, h } = { ...prev };

        if (resizeCorner.includes('n')) {
          h += y - pos.y;
          y = pos.y;
        }
        if (resizeCorner.includes('s')) {
          h = pos.y - y;
        }
        if (resizeCorner.includes('w')) {
          w += x - pos.x;
          x = pos.x;
        }
        if (resizeCorner.includes('e')) {
          w = pos.x - x;
        }

        return { x, y, w, h };
      });
    } else {
      const zone = getResizeZone(pos, selection);
      const cursors = {
        nw: "nwse-resize",
        se: "nwse-resize",
        ne: "nesw-resize",
        sw: "nesw-resize",
        n: "ns-resize",
        s: "ns-resize",
        e: "ew-resize",
        w: "ew-resize",
      };
      canvas.style.cursor = cursors[zone] || (isInSelection(pos) ? "move" : "default");
    }
  };

  const handleMouseUp = () => {
    setAction(null);
    setResizeCorner(null);
  };

  const handleApply = () => {
    const cropCanvas = document.createElement("canvas");
    const { x, y, w, h } = selection || {};
    if (!w || !h) return;

    cropCanvas.width = w;
    cropCanvas.height = h;
    const cropCtx = cropCanvas.getContext("2d");
    cropCtx.drawImage(imgRef.current, x, y, w, h, 0, 0, w, h);

    cropCanvas.toBlob((blob) => {
      if (onApplyCrop) onApplyCrop(blob);
    });
  };

  return (
    <div style={{ width: "100%", maxWidth: 400, margin: "0 auto", padding: 16 }}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ width: "100%", border: "1px solid #ccc" }}
      />
      <img
        ref={imgRef}
        src={imageSrc}
        alt="preview"
        onLoad={drawImage}
        style={{ display: "none" }}
      />

      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 16 }}>
        <ControlButton tooltip="Girar -45º" onClick={() => setRotation(r => r - 45)} icon={<FaUndo />} />
        <ControlButton tooltip="Girar +45º" onClick={() => setRotation(r => r + 45)} icon={<FaRedo />} />
        <ControlButton tooltip="Espelhar" onClick={() => setScaleX(x => x * -1)} icon={<FaArrowsAltH />} />
        <ControlButton tooltip="Zoom In" onClick={() => setZoom(z => Math.min(z + 0.1, 3))} icon={<FaSearchPlus />} />
        <ControlButton tooltip="Zoom Out" onClick={() => setZoom(z => Math.max(z - 0.1, 0.1))} icon={<FaSearchMinus />} />
        <ControlButton tooltip="Resetar" onClick={() => { setRotation(0); setScaleX(1); setZoom(1); setSelection(null); }} icon={<FaTrash />} />
        <ControlButton tooltip="Aplicar Corte" onClick={handleApply} icon={<FaCheck />} />
      </div>
    </div>
  );
};

export default ImageEditorCanvas;
