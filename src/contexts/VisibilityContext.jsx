import React, { createContext, useState, useContext, useEffect } from 'react';

const visibilityKeys = [
  'classification-view',
  'description-view',
  'takes-view',
  'audio-view',
  'locution-view',
  'audios-view'
];

const VisibilityContext = createContext();

export const VisibilityProvider = ({ children }) => {
  const [views, setViews] = useState(
    visibilityKeys.reduce((acc, key) => {
      acc[key] = 'show';
      return acc;
    }, {})
  );

  const [projectName, setProjectName] = useState(localStorage.getItem('project-name'));
  const [isImportedProject, setIsImportedProject] = useState(false);
  const [changeProject, setChangeProject] = useState(false);
  const [apiUrl, setApiUrl] = useState('');

  useEffect(() => {
    const savedName = localStorage.getItem('project-name');

    async function validateProjectName(name) {
      try {
        const res = await fetch(`${apiUrl ? apiUrl : 'http://localhost:4000'}/api/backups`, {
          method: 'GET',
          headers: {
            'ngrok-skip-browser-warning': '1',
            'Accept': 'application/json'
          }
        });
        const data = await res.json();
        const exists = data.backups.some(b => b.name === name);

        if (!exists) {
          localStorage.removeItem('project-name');
          setProjectName(null);
        } else {
          setProjectName(name);
        }
      } catch {
        setProjectName(null);
      }
    }

    if (savedName && savedName !== 'null') {
      validateProjectName(savedName);
    } else {
      setProjectName(null);
    }
  }, []);

  const toggleView = (key) => {
    setViews((prevViews) => ({
      ...prevViews,
      [key]: prevViews[key] === 'show' ? 'hide' : 'show',
    }));
  };

  return (
    <VisibilityContext.Provider
      value={{
        views,
        toggleView,
        projectName,
        setProjectName,
        isImportedProject,
        setIsImportedProject,
        changeProject,
        setChangeProject,
        apiUrl,
        setApiUrl
      }}
    >
      {children}
    </VisibilityContext.Provider>
  );
};

export const useVisibility = () => useContext(VisibilityContext);
