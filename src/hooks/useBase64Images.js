import { useEffect, useState } from "react";

// cache global pra não rebaixar a mesma imagem de novo
const cache = new Map();

export function useBase64Images(timecodes = [], apiUrl) {
  const [map, setMap] = useState({});

  useEffect(() => {
    let alive = true;

    (async () => {
      const result = { ...map };
      const jobs = [];

      for (const tc of timecodes) {
        if (!tc?.imageUrl || !tc?.id) continue;
        if (cache.has(tc.id)) {
          result[tc.id] = cache.get(tc.id);
          continue;
        }

        const url = `${apiUrl ? apiUrl : "http://localhost:4000"}${tc.imageUrl}`;
        jobs.push(
          fetch(url, {
            method: "GET",
            headers: {
              "ngrok-skip-browser-warning": "1",
              Accept: "application/json",
            },
          })
            .then((res) => res.blob())
            .then(
              (blob) =>
                new Promise((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result);
                  reader.readAsDataURL(blob);
                })
            )
            .then((dataURL) => {
              cache.set(tc.id, dataURL);
              result[tc.id] = dataURL;
            })
            .catch((e) => {
              // falha silenciosa: mantém sem base64
              console.warn("Erro carregando imagem", url, e);
            })
        );
      }

      await Promise.all(jobs);
      if (alive) setMap(result);
    })();

    return () => {
      alive = false;
    };
  }, [timecodes, apiUrl]);

  return map;
}
