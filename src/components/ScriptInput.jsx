import React, { useRef, useEffect, useState } from 'react';

const ScriptInput = ({ value, onChange, placeholder, id, readOnly }) => {
    const [provValue, setProvValue] = useState('');
    const textareaRef = useRef(null);

    useEffect(() => {
        setProvValue(value);
        setTimeout(() => {
            adjustHeight();
        }, 10);
    }, [value]);

    const adjustHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.style.height = 'auto'; // reset para pegar novo scrollHeight
          textarea.style.height = `${textarea.scrollHeight}px`;
        }
    };
    
    return (
        <div
            style={{
                width: 'calc(100% - 18px)',
                height: 'auto',
                borderLeft: '1px solid rgb(158, 156, 168)',
                cursor: readOnly ? 'default' : 'text',
                display: 'flex',
                alignItems: 'center', // Garante que o span e textarea fiquem alinhados verticalmente
            }}
        >
            {readOnly ?
                <span
                    style={{
                        padding: '0px 8px', // Padding equivalente ao textarea
                        marginLeft: '8px', // Margin para alinhar com o textarea
                        lineHeight: '1.5', // Garante que o line-height seja consistente
                        whiteSpace: 'pre-wrap', // Para manter quebras de linha
                        color: 'black',
                        fontSize: '13px',
                    }}
                >
                    {value}
                </span>
                :
                <textarea
                    id={id ? id : null}
                    ref={textareaRef}
                    value={provValue}
                    onChange={(event) => {
                        setProvValue(event.target.value);
                        adjustHeight();
                    }}
                    onBlur={(event) => {
                        onChange(event.target.value);
                    }}
                    style={{
                        width: '100%',
                        marginLeft: '12px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        outline: 'none',
                        resize: 'none',
                        overflow: 'hidden',
                        color: 'black',
                        fontSize: '13px',
                        padding: '0px', // Padding equivalente ao textarea
                    }}
                    rows={1}
                    placeholder={placeholder}
                />
            }
        </div>
    );
};

export default ScriptInput;
