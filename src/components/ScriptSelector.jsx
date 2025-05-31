import { useState, useEffect } from 'react';

export default function ScriptSelector({ scripts, setMoveSceneId }) {
  const [selectedScene, setSelectedScene] = useState(null);

  useEffect(() => {
    if (scripts && scripts.length > 0) {
      setSelectedScene(1); // seleciona o primeiro script por padrão
      setMoveSceneId(1)
    }
  }, [scripts]);

  const handleChange = (e) => {
    console.log(e.target.value)
    setSelectedScene(e.target.value);
    setMoveSceneId(e.target.value)
    // aqui você pode emitir para o pai, ex: onSelect(e.target.value)
  };

  return (
      <select
        value={selectedScene || ''}
        onChange={handleChange}
        style={{
            width: '200px',
            padding: '6px 12px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            fontSize: '14px',
        }}
      >
        {scripts.map((scene, id) => (
          <option key={scene.id} value={id + 1}>
            {scene.name}
          </option>
        ))}
      </select>
  );
}
