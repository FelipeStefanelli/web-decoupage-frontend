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
            textarea.style.height = 'auto';
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
                alignItems: 'center',
            }}
        >
            {readOnly ?
                <span
                    style={{
                        padding: '0px 8px',
                        marginLeft: '8px',
                        lineHeight: '1.5',
                        whiteSpace: 'pre-wrap',
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
                        padding: '0px',
                    }}
                    rows={1}
                    placeholder={placeholder}
                />
            }
        </div>
    );
};

export default ScriptInput;
