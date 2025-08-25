import Image from "@/components/Image";
import { useRef, useState, useEffect } from "react";
import html2pdf from 'html2pdf.js';
import { useVisibility } from '@/contexts/VisibilityContext';
import { toast } from 'react-toastify';
import { Link, useLocation } from 'react-router-dom';
import HeaderMenuOptions from '@/components/HeaderMenuOptions';
import HeaderDecoupagePreview from '@/components/HeaderDecoupagePreview';
import HeaderScriptPreview from '@/components/HeaderScriptPreview';

export default function Header(props) {
    const location = useLocation();
    const [modalVisible, setModalVisible] = useState(false);
    const [modalAnimation, setModalAnimation] = useState(false);
    const [data, setData] = useState(null);
    const [showPreview, setshowPreview] = useState(null);
    const [pdfController, setPdfController] = useState(null);

    const { views, projectName, apiUrl } = useVisibility();

    const contentRef = useRef(null);

    const pxToPt = (pixels) => {
        return pixels / 1.3333;
    };

    useEffect(() => {
        if (pdfController) {
            if (!projectName) {
                setPdfController(null);
                toast.error('Projeto sem nome!');
            } else {
                const now = new Date();
                const date = now.toISOString().slice(0, 10);
                const time = now.toTimeString().slice(0, 5).replace(':', '-');
                const filename = `${pdfController === 'decoupage' ? 'Decupagem - ' : 'Roteiro - '}${projectName} - ${date} ${time}.pdf`;
    
                const options = {
                    filename,
                    html2canvas: { scale: 2 },
                    jsPDF: {
                        unit: 'pt',
                        format: 'a4',
                        orientation: 'portrait'
                    },
                    pagebreak: {
                        mode: ['css','legacy'],           // primeiro tenta CSS; se falhar, usa heurística antiga
                        before: ['.page-break-avoid'],    // força quebra ANTES do bloco, se não couber
                        avoid: ['.page-break-avoid']      // tenta manter o bloco inteiro na página
                    }
                };

                html2pdf()
                    .from(contentRef.current.children[0].children[0])
                    .set(options) // Define as opções
                    .save(); // Salva o arquivo gerado
    
                toast.success('Download concluido com sucesso!')
                setPdfController(null);
            };
        }
    }, [pdfController]);

    const handleExportClick = async () => {
        if (!projectName) {
            toast.warn("Nome do projeto inválido");
            return;
            }

            try {
            // Ajuste a base URL do seu servidor (http://localhost:4000, por exemplo)
            const apiBase = apiUrl ? apiUrl : 'http://localhost:4000';
            const encodedName = encodeURIComponent(projectName);
            const url = `${apiBase}/api/backups/download/${encodedName}`;

            const response = await fetch(url, { 
                method: 'GET',
                headers: {
                    'ngrok-skip-browser-warning': '1',
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                toast.error(`Backup "${projectName}" não encontrado no servidor.`);
                } else {
                toast.error(`Falha ao baixar backup: HTTP ${response.status}`);
                }
                return;
            }

            // Converte em Blob (dados binários do ZIP)
            const zipBlob = await response.blob();

            // Se o blob não for um ZIP válido, informe
            if (zipBlob.size < 1000 || zipBlob.type !== 'application/zip') {
                console.error("Blob inesperado (não era um ZIP válido).");
                toast.error("Não foi possível obter um ZIP válido do servidor.");
                return;
            }

            // Cria URL para download
            const downloadUrl = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `${projectName}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            URL.revokeObjectURL(downloadUrl);
            toast.success(`Backup "${projectName}" baixado com sucesso.`);
            } catch (err) {
            console.error("Erro ao baixar backup:", err);
            toast.error("Ocorreu um erro inesperado ao baixar o backup.");
        }
    };

    const openModal = async () => {
        const response = await fetch(`${apiUrl ? apiUrl : 'http://localhost:4000'}/api?projectName=${projectName}`, {
            method: 'GET',
            headers: {
                'ngrok-skip-browser-warning': '1',
                'Accept': 'application/json'
            }
        });
        const data = await response.json();
        setData(data);
        setModalVisible(true);
        setTimeout(() => setModalAnimation(true), 20);
    };

    const closeModal = () => {
        setModalAnimation(false);
        // Espera a animação terminar antes de esconder
        setTimeout(() => {
          setModalVisible(false);
          setshowPreview(null);
        }, 200); // tempo igual à transição
    };

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();

    const exportDate = `${hours}:${minutes} - ${day}/${month}/${year}`;
    //const exportDate = `${day}/${month}/${year}`;

    return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '20px',
            backgroundColor: '#0a0a0a'
          }}
        >
            <p
                style={{
                    margin: "0 auto 0 0",
                    color: "rgba(196, 48, 43, 1)",
                    fontSize: "30px",
                    fontWeight: "500",
                    fontStyle: "italic"
                }}
            >
                Decoupage
            </p>
            <Link
                to="/"
                style={
                    location.pathname === "/" ?
                        { borderBottom: "2px solid rgba(196, 48, 43, 1)", padding: "3px 8px", textDecoration: 'none', color: 'rgb(196, 48, 43)', marginRight: '6px' }
                        :
                        { borderBottom: "2px solid transparent", padding: "3px 8px", textDecoration: 'none', color: 'rgb(255, 255, 255)', marginRight: '6px' }
                }
                onClick={() => {closeModal()}}
            >
                Decupagem
            </Link>
            <Link
                to="/script"
                style={
                    location.pathname === "/script" ?
                        { borderBottom: "2px solid rgba(196, 48, 43, 1)", padding: "3px 8px", textDecoration: 'none', color: 'rgb(196, 48, 43)', marginLeft: '6px' }
                        :
                        { borderBottom: "2px solid transparent", padding: "3px 8px", textDecoration: 'none', color: 'rgb(255, 255, 255)', marginLeft: '6px' }
                }
                onClick={() => {closeModal()}}
            >
                Roteiro
            </Link>
            <div className="project-name-display">
                <p 
                    style={{
                        margin: 0,
                        color: 'white',
                        pointerEvents: 'none',
                        width: '200px',
                        maxHeight: '40px',
                        fontSize: '14px',
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}
                >
                    {projectName}
                </p>
            </div>
            <button
                style={{
                    position: 'relative',
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 16px",
                    backgroundColor: 'rgba(76, 51, 170, 1)',
                    border: "1px solid rgba(76, 51, 170, 1)",
                    borderRadius: "8px",
                    marginLeft: "auto",
                    cursor: 'pointer'
                }}
                onClick={() => modalVisible ? closeModal() : openModal()}
            >
                <Image
                    aria-hidden
                    src="/share.svg"
                    alt="Compartilhar"
                    width={16}
                    height={16}
                    style={{ width: "16px", height: "16px" }}
                />
                <p style={{ color: 'white', margin: "2px 0" }}>Compartilhar</p>
            </button>
            {/* Modal de Visualização do PDF */}
            {modalVisible && (
                <div style={{
                  position: 'fixed',
                  top: 77,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  //backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  zIndex: 50
                }}>
                    <div style={{
                        position: 'absolute',
                        //top: '50%',
                        //left: '50%',
                        //transform: 'translate(-50%, -50%)',
                        top: 0,
                        left: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        backgroundColor: 'white',
                        borderRadius: '2px',
                        width: 'calc(100vw - 2rem)',
                        height: '100vh',
                        overflow: 'auto',
                        padding: '16px',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                        transition: 'transform 0.3s ease',
                        //transform: modalAnimation ? 'translate(-50%, -50%)' : 'translate(-150%, -50%)'
                        transform: modalAnimation ? 'translateX(0)' : 'translateX(-100%)',
                    }}>
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                width: '90%',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 0px 12px 0' }}>
                                <p
                                    style={{
                                        width: '100%',
                                        color: 'rgb(43, 35, 79)',
                                        fontSize: '20px',
                                        lineHeight: '18px',
                                        fontWeight: 800,
                                        letterSpacing: '0.5px',
                                        margin: '0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}
                                >
                                    <span>{showPreview ? 'Baixar' : 'Compartilhar'}</span>
                                </p>
                                {showPreview &&
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px', paddingRight: '24px' }}>
                                        <button style={{ all: 'unset', cursor: 'pointer' }}>
                                            <Image
                                                aria-hidden
                                                src="/back.svg"
                                                alt="Back icon"
                                                width={24}
                                                height={24}
                                                style={{ width: "24px", height: "24px", cursor: 'pointer' }}
                                                onClick={() => setshowPreview(null)}
                                            />
                                        </button>
                                    </div>
                                }
                                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', paddingRight: '12px' }}>
                                    <button  style={{ all: 'unset', cursor: 'pointer' }}>
                                        <Image
                                            src="/close-white.svg"
                                            alt="Close icon"
                                            width={32}
                                            height={32}
                                            style={{ width: "32px", height: "32px", cursor: 'pointer' }}
                                            onClick={() => closeModal()}
                                        />
                                    </button>
                                </div>
                            </div>
                            <HeaderMenuOptions
                                showPreview={showPreview}
                                handleExportClick={handleExportClick}
                                setshowPreview={setshowPreview}
                            />
                            {showPreview === 'decoupage' && (
                                <HeaderDecoupagePreview
                                    contentRef={contentRef}
                                    data={data}
                                    projectName={projectName}
                                    exportDate={exportDate}
                                />
                            )}

                            {showPreview === 'script' && (
                                <HeaderScriptPreview
                                    contentRef={contentRef}
                                    data={data}
                                    projectName={projectName}
                                    exportDate={exportDate}
                                    views={views}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}