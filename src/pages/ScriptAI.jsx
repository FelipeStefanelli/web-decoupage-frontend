import { useState } from 'react';
import { toast } from 'react-toastify';

export default function ScriptAI() {
  const [prompt, setPrompt] = useState(
    'Crie um roteiro de 10 segundos para promover um reality show inédito chamado "Fogo na Mata", onde chefs precisam cozinhar pratos gourmet em plena floresta amazônica, usando ingredientes da região e lidando com os desafios da natureza. O programa estreia sábado, às 21h, na TV Cultura. Quero uma chamada impactante, com narração envolvente, sugestão de trilha sonora e indicação de imagens para cada trecho.'
  );
  const [timer, setTimer] = useState('00:00:30');
  const [soundtrack, setSoundtrack] = useState('livre');
  const [versions, setVersions] = useState(1);
  const [script, setScript] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return toast.warn("Digite uma ideia para gerar o roteiro.");
    setLoading(true);

    try {
      const isElectron = window?.electronAPI !== undefined;

      if (isElectron) {
        const result = await window.electronAPI.generateScript(prompt, timer, soundtrack, versions);
        setLoading(false);

        if (result?.success) {
          setScript(result.script);
          toast.success("Roteiro gerado com sucesso!");
        } else {
          toast.error("Erro ao gerar roteiro com IA.");
        }
      } else {
        setLoading(false);
        toast.warn("Função de IA disponível apenas no modo desktop (Electron).");
      }
    } catch (error) {
      setLoading(false);
      console.log("Erro ao gerar roteiro:", error);
      toast.error("Falha inesperada ao gerar o roteiro.");
    }
  };

  const formatScript = (raw) => {
    const cleaned = raw
      .replace(/<\|system\|>|<\|user\|>|<\|assistant\|>/gi, '')
      .trim();

    const lines = cleaned.split('\n').map((line, i) => {
      if (line.match(/^\[.*\]$/)) {
        return <h4 key={i} style={{ color: '#007bff', marginTop: '1rem' }}>{line}</h4>;
      } else if (line.startsWith('IMAGEM:')) {
        return <p key={i}><strong>IMAGEM:</strong> {line.replace('IMAGEM:', '').trim()}</p>;
      } else if (line.startsWith('VOZ OFF:') || line.startsWith('VOZOFF')) {
        return <p key={i}><strong>VOZ OFF:</strong> {line.replace(/VOZ ?OFF:/, '').trim()}</p>;
      } else if (line.startsWith('TRILHA:')) {
        return <p key={i}><strong>TRILHA:</strong> {line.replace('TRILHA:', '').trim()}</p>;
      } else if (line.startsWith('TITULO:')) {
        return <p key={i}><strong>TÍTULO:</strong> {line.replace('TITULO:', '').trim()}</p>;
      } else {
        return <p key={i}>{line}</p>;
      }
    });

    return lines;
  };

  return (
    <div style={{ padding: '2rem', width: '80vw', margin: '0 auto' }}>
      <h2>Gerador de Roteiro com IA</h2>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Digite a ideia do roteiro..."
        rows={4}
        style={{
          width: '100%',
          padding: '1rem',
          fontSize: '1rem',
          borderRadius: '8px',
          border: '1px solid #ccc',
          resize: 'none',
          marginBottom: '1rem'
        }}
      />

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <input
          type="time"
          step="1"
          value={timer}
          onChange={(e) => setTimer(e.target.value)}
          style={{ flex: 1, padding: '0.5rem' }}
        />

        <select
          value={soundtrack}
          onChange={(e) => setSoundtrack(e.target.value)}
          style={{ flex: 2, padding: '0.5rem' }}
        >
          <option value="livre">Trilha livre</option>
          <option value="épica">Épica</option>
          <option value="tensa">Tensa</option>
          <option value="lúdica">Lúdica</option>
          <option value="emocional">Emocional</option>
          <option value="urbana">Urbana</option>
          <option value="cinematográfica">Cinematográfica</option>
        </select>

        <select
          value={versions}
          onChange={(e) => setVersions(Number(e.target.value))}
          style={{ flex: 1, padding: '0.5rem' }}
        >
          {[1, 2, 3].map((v) => (
            <option key={v} value={v}>
              {v} {v === 1 ? 'versão' : 'versões'}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading}
        style={{
          padding: '0.8rem 1.5rem',
          fontSize: '1rem',
          borderRadius: '6px',
          backgroundColor: 'rgb(196, 48, 43)',
          color: '#fff',
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '2rem'
        }}
      >
        {loading ? 'Gerando...' : 'Gerar Roteiro'}
      </button>

      {script && prompt && (
        <p style={{ fontStyle: 'italic', color: '#777', marginBottom: '1rem' }}>
          <strong>Entrada:</strong> {prompt}
        </p>
      )}

      {script && (
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: versions === 1 ? 'center' : 'space-between',
          }}
        >
          {(() => {
            const versionsCleaned = script
              .split(/(?:=== )?VERSÃO\s*\d+[:=]*/gi)
              .filter(v => v.trim().length > 20).slice(2);

            return versionsCleaned.map((versionText, idx) => (
              <div
                key={idx}
                style={{
                  flex: versions === 1 ? '1 1 100%' : versions === 2 ? '1 1 48%' : '1 1 30%',
                  background: '#fff',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  fontFamily: 'Arial, sans-serif',
                  border: '1px solid #ddd',
                  lineHeight: 1.6,
                  minWidth: '250px'
                }}
              >
                <h3 style={{ color: '#333' }}>Versão {idx + 1}</h3>
                {formatScript(versionText)}
              </div>
            ));
          })()}
        </div>
      )}
    </div>
  );
}
