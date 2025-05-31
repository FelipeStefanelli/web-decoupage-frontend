import { useState, useEffect, useCallback } from 'react';
import Image from '@/components/Image';
import { useVisibility } from '@/contexts/VisibilityContext';
import { toast } from 'react-toastify';

export default function SideMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [backups, setBackups] = useState([]);
  const [isCreatingNewProject, setIsCreatingNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const { projectName, setProjectName, setChangeProject, apiUrl, setApiUrl } = useVisibility();

  useEffect(() => {
    const apiUrlStorage = localStorage.getItem("api-url");
    apiUrlStorage && setApiUrl(apiUrlStorage);
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    try {
      const response = await fetch(`${apiUrl ? apiUrl : 'http://localhost:4000'}/api/backups`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      console.log(data.backups)
      if(data.backups.length === 0) {
        setProjectName("")
        localStorage.removeItem("project-name");
      }
      setBackups(data.backups);
    } catch (error) {
      console.error('Erro ao buscar backups:', error);
    }
  };

  const deleteBackup = async (backupName) => {
    if (!window.confirm(`Deseja realmente deletar o backup "${backupName}"?`)) return;
    try {
      const res = await fetch(`${apiUrl ? apiUrl : 'http://localhost:4000'}/api/backups/${backupName}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Backup deletado com sucesso!');
        let provProjectName = localStorage.getItem('project-name');
        if(provProjectName === backupName) {
          setProjectName('');
          localStorage.removeItem("project-name");
          setChangeProject(true);
        }
        fetchBackups();
      } else {
        const data = await res.json();
        toast.error(`Erro: ${data.error}`);
      }
    } catch (error) {
      console.error('Erro ao deletar backup:', error);
      toast.error('Erro ao deletar backup');
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      return toast.warn("Digite um nome para o novo projeto.");
    }

    try {
      const res = await fetch(`${apiUrl ? apiUrl : 'http://localhost:4000'}/api/reset?projectName=${newProjectName}`, { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        setProjectName(newProjectName);
        localStorage.setItem("project-name", newProjectName);
        setChangeProject(true);
        setNewProjectName('');
        setIsCreatingNewProject(false);
        toast.success('Novo projeto criado com sucesso');
        fetchBackups();
      } else {
        toast.error('Erro ao criar novo projeto');
      }
    } catch (error) {
      console.error("Erro ao criar novo projeto:", error);
      toast.error("Erro na comunicação com o servidor");
    }
  };

  const cancelNewProject = () => {
    setNewProjectName('');
    setIsCreatingNewProject(false);
    if (!projectName) {
      setProjectName(localStorage.getItem("project-name") || '');
    }
  };

  const toggleMenu = () => {
    if (isOpen && isCreatingNewProject) cancelNewProject();
    setIsOpen(!isOpen);
  };

  const handleImportFolderClick = async () => {
    // Abre o seletor de arquivos .zip
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.zip';
    fileInput.onchange = async () => {
      const file = fileInput.files?.[0];
      if (!file) return;

      const form = new FormData();
      form.append('backup', file);  // só o arquivo ZIP

      try {
        const res = await fetch(`${apiUrl ? apiUrl : 'http://localhost:4000'}/api/importFolder`, {
          method: 'POST',
          body: form
        });
        const result = await res.json();

        if (res.ok && result.success) {
          toast.success(result.message || 'Projeto importado com sucesso!');
          await fetchBackups();  // atualiza lista de backups na UI
          console.log(result.name)
          setProjectName(result.name);
          localStorage.setItem("project-name", result.name);
          setChangeProject(true);
        } else {
          toast.warn(result.message || 'Falha ao importar projeto!');
        }
      } catch (err) {
        console.error('Erro ao importar projeto:', err);
        toast.error('Erro ao importar projeto');
      }
    };
    fileInput.click();
  };
  const importProject = async (name) => {
    const res = await fetch(`${apiUrl ? apiUrl : 'http://localhost:4000'}/api/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: name }),
    });
    const result = await res.json();
    if (!res.ok) {
      toast.error('Erro: ' + result.error);
    } else {
      setProjectName(name);
      localStorage.setItem("project-name", name);
      setChangeProject(true);
      toast.success('Importado com sucesso');
    }
  };
  const pasteFromClipboard = useCallback(async () => {
    if (!navigator.clipboard?.readText) {
      console.warn('Clipboard API não suportada neste navegador.')
      return
    }
    try {
      const text = await navigator.clipboard.readText();
      setApiUrl(text);
      localStorage.setItem('api-url', text);
    } catch (err) {
      console.error('Falha ao colar do clipboard:', err);
    }
  }, []);
  return (
    <div
      style={{
        position: 'absolute',
        top: '77px',
        left: 0,
        height: 'calc(100vh - 78px)',
        zIndex: 40,
        display: 'flex',
        pointerEvents: isOpen ? 'auto' : 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          height: '100%',
          transform: isOpen ? 'translateX(0)' : 'translateX(-300px)',
          transition: 'transform 0.3s ease-in-out',
          pointerEvents: 'auto',
        }}
      >
        <div
          style={{
            display:'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '300px',
            height: '100%',
            backgroundColor: '#fff',
            boxShadow: '2px 0 5px rgba(0,0,0,0.2)',
            overflowY: 'auto',
            padding: '16px',
            boxSizing: 'border-box',
          }}
        >
          <div>
            {!isCreatingNewProject && (
            <button
              onClick={() => {
                setIsCreatingNewProject(true);
                setNewProjectName('');
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                padding: "12px 0",
                backgroundColor: "rgba(48, 48, 48, 1)",
                borderRadius: "8px",
                color: "white",
                width: '100%',
                marginBottom: '16px',
                cursor: 'pointer'
              }}
            >
              <p style={{ margin: 0, fontSize: '14px' }}>Novo Projeto</p>
            </button>
            )}
            <button
                onClick={handleImportFolderClick}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px",
                  padding: "12px 0",
                  backgroundColor: "rgba(48, 48, 48, 1)",
                  borderRadius: "8px",
                  color: "white",
                  width: '100%',
                  marginBottom: '24px',
                  cursor: 'pointer'
                }}
            >
                <p style={{ margin: 0, fontSize: '14px' }}>Importar pasta do projeto</p>
            </button>
            {/* Área de nome do projeto */}
            <div style={{ marginBottom: '24px' }}>
              <p style={{ marginBottom: '12px', fontWeight: 600, color: '#333', fontSize: '14px' }}>{isCreatingNewProject ? 'Digite um nome para o projeto:' : 'Nome do projeto:'}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {isCreatingNewProject ? (
                  <div style={{ display: 'flex', flexDirection:'column', gap: '16px', width: '100%' }}>
                    <input
                      style={{
                        width: '100%',
                        padding: "4px 0",
                        backgroundColor: "transparent",
                        borderRadius: "1px",
                        outline: "none",
                        color: 'black',
                        borderTop: 'none',
                        borderLeft: 'none',
                        borderRight: 'none',
                      }}
                      placeholder="Digite o nome"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                    />
                    <button
                      style={{
                        border: '1px solid black',
                        outline: 'none',
                        backgroundColor: 'transparent',
                        padding: '6px 0',
                        fontSize: '14px',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                      onClick={handleCreateProject}
                    >
                      Criar projeto
                    </button>
                    <button
                      style={{
                        border: '1px solid rgb(255, 100, 100)',
                        outline: 'none',
                        backgroundColor: 'transparent',
                        padding: '6px 0',
                        fontSize: '14px',
                        borderRadius: '6px',
                        color: 'rgb(255, 100, 100)',
                        cursor: 'pointer'
                      }}
                      onClick={cancelNewProject}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <>
                    <span style={{ flex: 1, fontSize: '14px', fontWeight: '500', color: '#111' }}>
                      {projectName || 'Sem projeto'}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Lista de backups (somente se não estiver criando novo projeto) */}
            {!isCreatingNewProject && (
              <>
                <p style={{
                  fontWeight: 'bold',
                  marginBottom: '10px',
                  fontSize: '14px',
                  color: '#c4302b'
                }}>Projetos Salvos</p>

                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {backups.length === 0 && (
                    <li style={{ padding: '12px 16px', color: '#777', fontSize: '13px' }}>
                      Nenhum projeto salvo
                    </li>
                  )}
                  {backups.map((backup) => (
                    <li
                      key={backup.name}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 12px',
                        fontSize: '13px',
                        backgroundColor: backup.name === projectName ? '#ffeaea' : 'transparent',
                        borderBottom: '1px solid #eee',
                      }}
                    >
                      <span
                        style={{
                          flex: 1,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          color: backup.name === projectName ? '#c4302b' : '#333'
                        }}
                      >
                        {backup.name}
                      </span>

                      {backup.name !== projectName && (
                        <Image
                          src="/import3.svg"
                          alt="Importar"
                          width={20}
                          height={20}
                          style={{ marginLeft: '8px', cursor: 'pointer', opacity: 0.7 }}
                          onClick={() => importProject(backup.name)}
                        />
                      )}
                      <Image
                        src="/trash.svg"
                        alt="Excluir"
                        width={24}
                        height={24}
                        style={{ marginLeft: '12px', cursor: 'pointer', opacity: 0.7 }}
                        onClick={() => deleteBackup(backup.name)}
                      />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', paddingTop: '16px' }}>
            <span style={{ fontSize: '14px' }}>API:</span>
            <input
              disabled
              value={apiUrl}
              onChange={(e) => {
                localStorage.setItem("api-url", e.target.value)
                setApiUrl(e.target.value);
              }}
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            />
            <Image
              src="/paste.svg"
              alt="Colar"
              width={24}
              height={24}
              style={{ marginLeft: '12px', cursor: 'pointer', opacity: 0.7 }}
              onClick={() => pasteFromClipboard()}
            />
            <Image
              src="/trash.svg"
              alt="Excluir"
              width={24}
              height={24}
              style={{ marginLeft: '12px', cursor: 'pointer', opacity: 0.7 }}
              onClick={() => {
                setApiUrl('');
                localStorage.removeItem("api-url")
              }}
            />
          </div>
        </div>

        {/* Botão lateral de abrir/fechar */}
        <div
          onClick={toggleMenu}
          style={{
            backgroundColor: '#1e1e1e',
            padding: '0 12px',
            borderTopRightRadius: '2px',
            borderBottomRightRadius: '2px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
          }}
        >
          <div
            style={{
              transition: 'transform 0.5s ease-in-out',
              transform: isOpen ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
          >
            <Image src="/menu-right-white.svg" alt="Abrir Menu" width={24} height={24} />
          </div>
        </div>
      </div>
    </div>
  );
}
