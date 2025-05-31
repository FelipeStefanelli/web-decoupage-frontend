import React, { useState } from 'react';

const LockScreen = ({ onUnlock }) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const getCurrentPassword = () => {
    const now = new Date();
    const hours = now.getHours(); // 0–23
  
    //return `sara${hours}`;
    return `sara`;
  };
  
    const handleUnlock = () => {
    const expectedPassword = getCurrentPassword();
    if (input === expectedPassword) {
        onUnlock();
    } else {
        setError('Senha incorreta');
    }
    };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'white',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      fontFamily: 'sans-serif',
    }}>
      <h2>🔒 Digite a senha para continuar</h2>
      <input
        type="password"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        style={{
          padding: '10px',
          fontSize: '16px',
          marginTop: '10px',
          border: '1px solid #ccc',
          borderRadius: '4px',
        }}
      />
      <button
        onClick={handleUnlock}
        style={{
          marginTop: '10px',
          padding: '8px 16px',
          fontSize: '16px',
          cursor: 'pointer',
        }}
      >
        Entrar
      </button>
      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
    </div>
  );
};

export default LockScreen;
