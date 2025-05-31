import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';

const TimecodeInput = ({
  timecode,
  updateTimecode,
  readOnly = false,
  setIsDraggingOverTextarea
}) => {
  const [provValue, setProvValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef(null);

  // só redimensiona quando estiver focado
  const adjustHeight = () => {
    const ta = textareaRef.current;
    if (ta && isFocused) {
      ta.style.height = `${ta.scrollHeight - 16}px`;
    }
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    setProvValue(newValue);
    updateTimecode({ ...timecode, text: newValue });
    // vai disparar o useEffect também, mas não faz mal repetir
    adjustHeight();
  };

  // sempre que o timecode mudar, atualizo o provValue
  useLayoutEffect(() => {
    setProvValue(timecode.text);
  }, [timecode.text]);

  // quando o conteúdo mudar e estivermos focados, ajusta a altura
  useEffect(() => {
    if (isFocused) adjustHeight();
  }, [provValue, isFocused]);

  const borderLeft = timecode.type === 'V'
    ? '3px solid rgb(0, 40, 77)'
    : timecode.type === 'A'
      ? '3px solid rgb(44, 146, 128)'
      : timecode.type === 'AV'
        ? '3px solid rgb(146, 44, 44)'
        : '0';

  if (readOnly) {
    return (
      <span style={{ marginLeft: 8, padding: '4px 8px 4px 0', fontSize: '13px' }}>
        {timecode.text}
      </span>
    );
  }

  return (
    <textarea
      ref={textareaRef}
      value={provValue}
      rows={1}
      onFocus={() => {
        setIsFocused(true);
        adjustHeight();
      }}
      onBlur={() => {
        setIsFocused(false);
        // reseta inline-height pra voltar ao rows={1}
        const ta = textareaRef.current;
        if (ta) ta.style.height = '32px';
      }}
      onChange={handleChange}
      onMouseEnter={() => setIsDraggingOverTextarea(true)}
      onMouseLeave={() => setIsDraggingOverTextarea(false)}
      style={{
        width: 'calc(100% - 30px)',
        height: '32px',
        margin: '0px 8px 8px 8px',
        backgroundColor: 'rgb(231, 231, 231)',
        padding: '8px 0 8px 12px',
        border: 'none',
        outline: 'none',
        resize: 'none',
        color: 'black',
        fontSize: 13,
        flexGrow: 1,
        cursor: 'text',
        borderLeft,
        borderRadius: 6,
        overflow: 'auto'
      }}
    />
  );
};

export default TimecodeInput;
