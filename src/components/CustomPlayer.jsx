import { useEffect, useMemo, useRef, useState } from "react";

function formatHHMMSS(sec = 0) {
  if (!Number.isFinite(sec)) sec = 0;
  const s = Math.max(0, Math.floor(sec));
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return h + ":" + m + ":" + ss;
}

export default function CustomPlayer({ videoRef, src, type = "video/mp4" }) {
  const localRef = useRef(null);
  const ref = videoRef ?? localRef;

  const [isPlaying, setIsPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [vol, setVol] = useState(1);
  const [rate, setRate] = useState(1);

  // listeners básicos
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onLoaded = () => { setDur(Number.isFinite(el.duration) ? el.duration : 0); };
    const onTime = () => setCur(Number.isFinite(el.currentTime) ? el.currentTime : 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnd = () => setIsPlaying(false);

    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnd);

    return () => {
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnd);
    };
  }, [src]);

  const toggle = async () => {
    const el = ref.current; if (!el) return;
    if (el.paused || el.ended) { try { await el.play(); } catch { } }
    else { try { el.pause(); } catch { } }
  };

  const seekTo = (t) => {
    const el = ref.current; if (!el) return;
    const next = Math.min(Math.max(0, t), Number.isFinite(dur) ? dur : t);
    try { el.currentTime = next; } catch { }
  };

  const seekBy = (delta) => seekTo(cur + delta);

  const onScrub = (e) => {
    const v = Number(e.target.value);
    seekTo(v);
  };

  const changeVolume = (v) => {
    const el = ref.current; if (!el) return;
    const vol = Math.min(1, Math.max(0, v));
    el.volume = vol;
    setVol(vol);
  };

  const cycleRate = () => {
    const el = ref.current; if (!el) return;
    const options = [1, 1.5, 2];
    const i = (options.indexOf(rate) + 1) % options.length;
    const r = options[i];
    el.playbackRate = r;
    setRate(r);
  };

  const goFullscreen = async () => {
    const wrap = containerRef.current;
    if (!wrap) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => { });
    } else {
      await wrap.requestFullscreen().catch(() => { });
    }
  };

  const containerRef = useRef(null);

  return (
    <div ref={containerRef} style={{
      display: "flex", flexDirection: "column", width: "100%", gap: 8
    }}>
      <video
        ref={ref}
        src={src}
        playsInline
        // CONTROLES NATIVOS DESLIGADOS:
        controls={false}
        // evita sobreposições de UI
        style={{ width: "100%", display: "block", borderRadius: 8, background: "black" }}
      >
        <source src={src} type={type} />
      </video>

      {/* Barra de controles SEMPRE visível */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 10px",
        background: "rgba(20,20,20,0.9)",
        borderRadius: 8,
        color: "white"
      }}>
        <button onClick={toggle} style={btnStyle}>{isPlaying ? "⏸" : "▶️"}</button>
        <button onClick={() => seekBy(-3)} style={btnStyle}>⏪ 3s</button>
        <button onClick={() => seekBy(+3)} style={btnStyle}>⏩ 3s</button>

        <span style={{ fontVariantNumeric: "tabular-nums", width: 64, textAlign: "right" }}>
          {formatHHMMSS(cur)}
        </span>

        <input
          type="range"
          min={0}
          max={dur || 0}
          step="0.01"
          value={Math.min(cur, dur || 0)}
          onChange={onScrub}
          style={{ flex: 1 }}
        />

        <span style={{ fontVariantNumeric: "tabular-nums", width: 64 }}>
          {formatHHMMSS(dur)}
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12 }}>🔊</span>
          <input
            type="range"
            min={0}
            max={1}
            step="0.01"
            value={vol}
            onChange={(e) => changeVolume(parseFloat(e.target.value))}
          />
        </div>

        <button onClick={cycleRate} title="Velocidade" style={btnStyle}>
          {rate.toFixed(1)}x
        </button>

        <button onClick={goFullscreen} title="Tela cheia" style={btnStyle}>⛶</button>
      </div>
    </div>
  );
}

const btnStyle = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #444",
  background: "#2a2a2a",
  color: "white",
  cursor: "pointer"
};
