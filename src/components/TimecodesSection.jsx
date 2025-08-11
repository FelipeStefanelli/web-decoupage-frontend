'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react';
import TimecodeCard from "@/components/TimecodeCard";
import ScriptInput from "@/components/ScriptInput";
import Image from "@/components/Image";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useVisibility } from '@/contexts/VisibilityContext';
import ScriptSelector from './ScriptSelector';
import { motion, AnimatePresence } from 'framer-motion';
import { useBase64Images } from "../hooks/useBase64Images";

const TimecodesSection = (props) => {
    console.log('TimecodesSection renderizou');
    const [timecodes, setTimecodes] = useState([]);
    const [scripts, setScripts] = useState([]);
    const [activeMenu, setActiveMenu] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(null);
    const [moveDropdownOpen, setMoveDropdownOpen] = useState(null);
    const [moveSceneId, setMoveSceneId] = useState('');
    const [showFilter, setShowFilter] = useState(false);
    const [filterText, setFilterText] = useState('');
    const [selectedTypes, setSelectedTypes] = useState([]);
    const [visualizationDropdownOpen, setVisualizationDropdownOpen] = useState(false);
    const [gridHeight, setGridHeight] = useState('');
    const [isDraggingOverTextarea, setIsDraggingOverTextarea] = useState(false);
    const [fetchingTimecodes, setFetchingTimecodes] = useState(false);

    const filterRef = useRef(null);
    const timecodesGridRef = useRef(null);

    const { views, toggleView, projectName, changeProject, setChangeProject, apiUrl } = useVisibility();

    const draggedCard = useRef(null);
    const draggedCardInfo = useRef(null);
    const dropZone = useRef(null);

    useEffect(() => {
        const updateHeight = () => {
            const filterHeight = filterRef.current?.offsetHeight || 0;
            console.log(filterHeight)
            const filterPlusHeader = filterHeight + 82;
            setGridHeight(`calc(100vh - ${filterPlusHeader}px)`);
        };
        updateHeight();
    }, [visualizationDropdownOpen]);

    useEffect(() => {
        if (projectName) {
            fetchTimecodes();
        }
    }, []);

    useEffect(() => {
        if (changeProject === true && !projectName) {
            setTimecodes([]);
            setScripts([]);
            setChangeProject(false);
        }
        if (changeProject === true && projectName) {
            fetchTimecodes();
            setChangeProject(false);
        }
    }, [changeProject]);

    const fetchTimecodes = async () => {
        setFetchingTimecodes(true);
        const response = await fetch(`${apiUrl ? apiUrl : 'http://localhost:4000'}/api?projectName=${projectName}`, {
            method: 'GET',
            headers: {
                'ngrok-skip-browser-warning': '1',
                'Accept': 'application/json'
            }
        });
        const data = await response.json();
        console.log(data)
        if (data) {
            data?.timecodes && setTimecodes(data.timecodes);
            data?.script && setScripts(data.script);
            setChangeProject(false);
        }

        setFetchingTimecodes(false);
    };

    const updateJson = async (updatedTimecodes, updatedScript) => {
        await fetch(`${apiUrl ? apiUrl : 'http://localhost:4000'}/api?projectName=${projectName}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                scope: 'timecode-move',
                json: {
                    timecodes: updatedTimecodes,
                    script: updatedScript
                }
            }),
        });
        await fetchTimecodes();
    };

    const ratingChanged = (timecode, newRating, scope) => {
        const scopeProv = scope ?? 'timecodes'
        const updatedTimecode = { ...timecode, rating: newRating };
        updateTimecode(updatedTimecode, scopeProv);
    };

    const updateTimecode = async (updatedTimecode, scope = "timecodes", script = null) => {
        await fetch(`${apiUrl ? apiUrl : 'http://localhost:4000'}/api?projectName=${projectName}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                scope,
                timecode: updatedTimecode,
                script
            }),
        });
        await fetchTimecodes();
    };

    const changeScene = (script, field, isValueChange, value) => {
        if (isValueChange) {
            script[field] = value;
            updateTimecode(null, 'script', script);
        } else {
            const hasField = script.activeFields.includes(field);
            if (hasField) {
                script.activeFields = script.activeFields.filter(item => item !== field)
            } else {
                script.activeFields.push(field);
            }
        }
        updateTimecode(null, 'script', script);
    };

    const addScene = (id) => {
        var updatedTimecodes = [...timecodes];
        var updatedScripts = [...scripts];
        updatedScripts.splice(id + 1, 0, {
            "id": '',
            "name": '',
            "description": "",
            "audio": "",
            "locution": "",
            "activeFields": [],
            "timecodes": [],
            "audios": []
        });
        updatedScripts = updatedScripts.map((script, scriptId) => {
            return {
                "id": `scene-${scriptId + 1}`,
                "name": `Cena ${scriptId + 1}`,
                "description": script.description,
                "audio": script.audio,
                "locution": script.locution,
                "activeFields": script.activeFields,
                "timecodes": script.timecodes,
                "audios": script.audios
            }
        })
        updateJson(updatedTimecodes, updatedScripts);
    }

    const removeScene = (id) => {
        if (!window.confirm(`Deseja realmente deletar a Cena ${id + 1}?`)) return;

        const updatedTimecodes = [...timecodes];
        const updatedScripts = [...scripts];
        updatedScripts.splice(id, 1);
        updatedScripts.map((script, scriptId) => {
            script.id = `scene-${scriptId + 1}`;
            script.name = `Cena ${scriptId + 1}`
        });
        console.log('updatedScripts', updatedScripts)
        updateJson(updatedTimecodes, updatedScripts)
    }

    const moveSceneById = (value, id) => {
        console.log(value)
        console.log(id)
        setMoveDropdownOpen(null);
        setMoveSceneId('');
        const sceneId = id;
        const newSceneId = parseInt(value);
        var updatedTimecodes = [...timecodes];
        var updatedScripts = [...scripts];
        var removedScript = updatedScripts.splice(sceneId, 1);
        updatedScripts.splice(newSceneId - 1, 0, removedScript[0]);
        updatedScripts.map((script, scriptId) => {
            script.id = `scene-${scriptId + 1}`;
            script.name = `Cena ${scriptId + 1}`
        });
        console.log(updatedScripts)
        updateJson(updatedTimecodes, updatedScripts);
    }

    function alertError(msg) {
        return toast.error(msg);
    }

    function checkTakeMove(draggedCardInfo, scriptTimecodesAudios, type) {
        console.log('draggedCardInfo', draggedCardInfo)
        console.log('scriptTimecodes', scriptTimecodesAudios)
        let canMoveTake = true;
        let error = '';

        if (draggedCardInfo.current.type === "") {
            canMoveTake = false;
            error = "Classifique o take para move-lo a uma cena!";
            return {
                canMoveTake,
                error
            }
        } else if (type === 'timecode' && draggedCardInfo.current.type === 'A') {
            canMoveTake = false;
            error = "Áudios só podem ser movidos para a coluna de áudio";
            return {
                canMoveTake,
                error
            }
        } else if (type === 'audio' && (draggedCardInfo.current.type === 'V' || draggedCardInfo.current.type === 'AV')) {
            canMoveTake = false;
            error = "Videos só podem ser movidos para a coluna de takes";
            return {
                canMoveTake,
                error
            }
        } else {
            scriptTimecodesAudios.timecodes.map(timecode => {
                if (timecode.type === 'AV') {
                    canMoveTake = false;
                    error = "Essa cena já contém um AV e não pode receber mais takes!";
                }
                if (timecode.type === 'V' && draggedCardInfo.current.type === 'AV') {
                    canMoveTake = false;
                    error = "Essa cena já contém um vídeo, portanto não pode receber um AV!";
                }
            });
            scriptTimecodesAudios.audios.map(timecode => {
                if (timecode.type === 'A' && draggedCardInfo.current.type === 'AV') {
                    canMoveTake = false;
                    error = "Essa cena já contém um áudio, portanto não pode receber um AV!";
                }
            });
            return {
                canMoveTake,
                error
            }
        }
    }

    function createDropZone() {
        const zone = document.createElement('div');

        zone.classList.add('card', 'drop-zone');
        return zone;
    }

    function getDropPosition(targetGrid, event) {
        const allCards = [...targetGrid.querySelectorAll('.card')];
        const rects = allCards.map(card => card.getBoundingClientRect());
        return rects.findIndex(rect => event.clientY < rect.bottom && event.clientX < rect.right);
    }

    const handleDragStart = (event, card) => {
        if (isDraggingOverTextarea || fetchingTimecodes) {
            event.preventDefault();
            return;
        }

        draggedCard.current = event.currentTarget;
        console.log('card', card)
        draggedCardInfo.current = card;

        if (draggedCard.current) {
            console.log('teste')
            setTimeout(() => draggedCard.current.classList.add('hidden'), 0);
        }
    };
    const handleDragEnd = event => {
        if (draggedCard.current) { // Verifica se draggedCard não é null
            if (dropZone) {
                dropZone.current.remove();
                dropZone.current = null;
            }

            draggedCard.current.classList.remove('hidden'); // Faz o card voltar a ser visível
            draggedCard.current = null;
        }
    };

    const handleDragOver = event => {
        event.preventDefault();

        const grid = event.currentTarget;

        // ─── Auto-scroll ─────────────────────────────────────────────────────
        const { top, bottom } = grid.getBoundingClientRect();
        const maxOffset = 140;       // até onde a zona de auto-scroll vale
        const y = event.clientY;

        // checa topo
        if (y < top + maxOffset) {
            const dist = y - top;     // 0 quando encosta na borda, até maxOffset
            let speed;
            if (dist < 40) speed = 9;
            else if (dist < 90) speed = 5;
            else speed = 3;
            grid.scrollBy(0, -speed);
        }
        // checa base
        else if (y > bottom - maxOffset) {
            const dist = bottom - y;
            let speed;
            if (dist < 40) speed = 9;
            else if (dist < 90) speed = 5;
            else speed = 3;
            grid.scrollBy(0, speed);
        }

        // ─── Drop-zone ───────────────────────────────────────────────────────
        const droppedPosition = getDropPosition(grid, event);

        // remove zona antiga
        const existing = grid.querySelector('.drop-zone');
        if (existing) existing.remove();

        // cria se ainda não existir
        if (!dropZone.current) dropZone.current = createDropZone();

        // ajusta classe de acordo com o grid
        dropZone.current.classList.toggle('timecode-drop-zone', grid.id.includes('timecodes'));
        dropZone.current.classList.toggle('script-drop-zone', grid.id.includes('scripts'));
        dropZone.current.classList.toggle('audio-drop-zone', grid.id.includes('audios'));

        // insere na posição certa
        if (droppedPosition === -1 || grid.children.length === 0) {
            grid.appendChild(dropZone.current);
        } else {
            grid.insertBefore(dropZone.current, grid.children[droppedPosition]);
        }
    };

    const handleDrop = event => {
        const grid = event.currentTarget;
        const gridType = grid.id.includes('timecodes') ? 'timecodes' : grid.id.includes('scripts') ? 'scripts' : grid.id.includes('audios') ? 'audios' : '';
        const droppedPosition = getDropPosition(grid, event);
        if (dropZone.current) dropZone.current.remove();

        if (draggedCard.current && grid) {
            if (gridType === 'timecodes') {
                if (draggedCard.current.parentElement.id === 'grid-timecodes') {
                    const updatedTimecodes = [...timecodes];

                    // Remove o card da posição original
                    const originalIndex = updatedTimecodes.indexOf(draggedCardInfo.current);
                    updatedTimecodes.splice(originalIndex, 1);

                    // Ajusta a posição de inserção se o card foi arrastado dentro da mesma lista
                    const adjustedPosition = droppedPosition > originalIndex ? droppedPosition - 1 : droppedPosition;

                    // Insere o card na nova posição ajustada
                    updatedTimecodes.splice(adjustedPosition, 0, draggedCardInfo.current);

                    // Atualiza o estado do grid-timecodes
                    setTimecodes(updatedTimecodes);
                    updateJson(updatedTimecodes, scripts);
                } else if (draggedCard.current.parentElement.id.includes('grid-scripts')) {
                    const draggedFromScript = draggedCard.current.parentElement.id.replace('grid-scripts-', '');
                    const updatedTimecodes = [...timecodes];
                    const updatedScripts = [...scripts];

                    // Remove o card de grid-scripts
                    updatedScripts[draggedFromScript].timecodes.splice(updatedScripts[draggedFromScript].timecodes.indexOf(draggedCardInfo.current), 1);

                    // Insere o card no grid-timecodes na posição correta
                    updatedTimecodes.splice(droppedPosition, 0, draggedCardInfo.current);

                    // Atualiza os estados dos grids
                    setTimecodes(updatedTimecodes);
                    setScripts(updatedScripts);
                    updateJson(updatedTimecodes, updatedScripts);
                } else if (draggedCard.current.parentElement.id.includes('grid-audios')) {
                    const draggedFromScript = draggedCard.current.parentElement.id.replace('grid-audios-', '');
                    const updatedTimecodes = [...timecodes];
                    const updatedScripts = [...scripts];

                    // Remove o card de grid-scripts
                    updatedScripts[draggedFromScript].audios.splice(updatedScripts[draggedFromScript].audios.indexOf(draggedCardInfo.current), 1);

                    // Insere o card no grid-audios na posição correta
                    updatedTimecodes.splice(droppedPosition, 0, draggedCardInfo.current);

                    // Atualiza os estados dos grids
                    setTimecodes(updatedTimecodes);
                    setScripts(updatedScripts);
                    updateJson(updatedTimecodes, updatedScripts);
                }
            } else if (gridType === 'scripts') {
                if (draggedCard.current.parentElement.id === 'grid-timecodes') {
                    const draggedFromScript = grid.id.replace('grid-scripts-', '');
                    const updatedTimecodes = [...timecodes];
                    const updatedScripts = [...scripts];

                    const movePermissions = checkTakeMove(draggedCardInfo, updatedScripts[draggedFromScript], 'timecode');
                    if (movePermissions && !movePermissions.canMoveTake) {
                        return alertError(movePermissions.error);
                    }

                    const originalIndex = updatedTimecodes.indexOf(draggedCardInfo.current);
                    updatedTimecodes.splice(originalIndex, 1);

                    // Insere o card no grid-timecodes na posição correta
                    updatedScripts[draggedFromScript].timecodes.splice(droppedPosition, 0, draggedCardInfo.current);

                    // Atualiza os estados dos grids
                    setTimecodes(updatedTimecodes);
                    setScripts(updatedScripts);
                    updateJson(updatedTimecodes, updatedScripts);
                } else if (draggedCard.current.parentElement.id.includes('grid-scripts')) {
                    const draggedFromScript = draggedCard.current.parentElement.id.replace('grid-scripts-', '');
                    const draggedToScript = grid.id.replace('grid-scripts-', '');
                    const updatedTimecodes = [...timecodes];
                    const updatedScripts = [...scripts];

                    const movePermissions = checkTakeMove(draggedCardInfo, updatedScripts[draggedFromScript], 'timecode');
                    if (movePermissions && !movePermissions.canMoveTake) {
                        return alertError(movePermissions.error);
                    }
                    updatedScripts[draggedFromScript].timecodes.splice(updatedScripts[draggedFromScript].timecodes.indexOf(draggedCardInfo.current), 1);

                    // Insere o card no grid-timecodes na posição correta
                    updatedScripts[draggedToScript].timecodes.splice(droppedPosition, 0, draggedCardInfo.current);

                    // Atualiza os estados dos grids
                    setTimecodes(updatedTimecodes);
                    setScripts(updatedScripts);
                    updateJson(updatedTimecodes, updatedScripts);
                } else if (draggedCard.current.parentElement.id.includes('grid-audios')) {
                    alertError('Não pode mover audio para take')
                }
            } else if (gridType === 'audios') {
                if (draggedCard.current.parentElement.id === 'grid-timecodes') {
                    const draggedFromAudio = grid.id.replace('grid-audios-', '');
                    const updatedTimecodes = [...timecodes];
                    const updatedScripts = [...scripts];

                    const movePermissions = checkTakeMove(draggedCardInfo, updatedScripts[draggedFromAudio], 'audio');
                    if (movePermissions && !movePermissions.canMoveTake) {
                        return alertError(movePermissions.error);
                    }

                    const originalIndex = updatedTimecodes.indexOf(draggedCardInfo.current);
                    updatedTimecodes.splice(originalIndex, 1);

                    // Insere o card no grid-timecodes na posição correta
                    updatedScripts[draggedFromAudio].audios.splice(droppedPosition, 0, draggedCardInfo.current);

                    // Atualiza os estados dos grids
                    setTimecodes(updatedTimecodes);
                    setScripts(updatedScripts);
                    updateJson(updatedTimecodes, updatedScripts);
                } else if (draggedCard.current.parentElement.id.includes('grid-audios')) {
                    const draggedFromScript = draggedCard.current.parentElement.id.replace('grid-audios-', '');
                    const draggedToScript = grid.id.replace('grid-audios-', '');
                    const updatedTimecodes = [...timecodes];
                    const updatedScripts = [...scripts];

                    const movePermissions = checkTakeMove(draggedCardInfo, updatedScripts[draggedFromScript], 'audio');
                    if (movePermissions && !movePermissions.canMoveTake) {
                        return alertError(movePermissions.error);
                    }
                    updatedScripts[draggedFromScript].audios.splice(updatedScripts[draggedFromScript].audios.indexOf(draggedCardInfo.current), 1);

                    // Insere o card no grid-audios na posição correta
                    updatedScripts[draggedToScript].audios.splice(droppedPosition, 0, draggedCardInfo.current);

                    // Atualiza os estados dos grids
                    setTimecodes(updatedTimecodes);
                    setScripts(updatedScripts);
                    updateJson(updatedTimecodes, updatedScripts);
                } else if (draggedCard.current.parentElement.id.includes('grid-scripts')) {
                    alertError('Não pode mover take para audio')
                }
            }
        }
        console.log(draggedCard.current)
        draggedCard.current.classList.remove('hidden');
        setTimeout(() => {
            draggedCard.current = null;
        }, 10);
    };

    const toggleDropdown = (id) => {
        setDropdownOpen(dropdownOpen === id ? null : id);
    };

    const toggleMoveDropdown = (id) => {
        setMoveDropdownOpen(moveDropdownOpen === id ? null : id);
        if (moveDropdownOpen) {
            setTimeout(() => {
                document.getElementById(`scene-${id + 1}`).focus();
            }, 10);
        }
    };

    const filteredTimecodes = props.script ?
        timecodes.filter(tc => (!filterText || tc.text?.toLowerCase().includes(filterText.toLowerCase())) && (selectedTypes.length === 0 || selectedTypes.includes(tc.type)))
        :
        timecodes.filter(tc => (!filterText || tc.text?.toLowerCase().includes(filterText.toLowerCase())) && (selectedTypes.length === 0 || selectedTypes.includes(tc.type)))
        ;

    const base64Map = useBase64Images(timecodes, apiUrl);
    return (
        <div style={props.script ? { display: 'flex', width: '100%', height: 'calc(100vh - 77px)' } : { display: 'flex', width: '60%', height: 'calc(100vh - 77px)', backgroundColor: "rgba(231, 231, 231)", }}>
            <div style={{ width: props.script ? '40%' : '100%' }}>
                <div
                    style={{
                        padding: props.script ? '16px 16px 16px 64px' : '16px 16px 16px 16px',
                        backgroundColor: "rgba(231, 231, 231)",
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}
                >
                    <button
                        onClick={() => setShowFilter(prev => !prev)}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#c4302b',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Filtrar
                    </button>

                    {showFilter && (
                        <>
                            <input
                                type="text"
                                value={filterText}
                                onChange={(e) => setFilterText(e.target.value)}
                                placeholder="Filtrar por texto"
                                style={{
                                    padding: '7px 12px',
                                    borderRadius: '4px',
                                    border: '1px solid #ccc',
                                    flex: '1',
                                    minWidth: '180px',
                                    outline: 'none'
                                }}
                            />

                            <div style={{ display: 'flex', gap: '8px' }}>
                                {[
                                    { type: 'A', icon: '/A.svg', alt: 'Áudio' },
                                    { type: 'V', icon: '/V.svg', alt: 'Vídeo' },
                                    { type: 'AV', icon: '/AV.svg', alt: 'Áudio-Vídeo' }
                                ].map(({ type, icon, alt }) => (
                                    <button
                                        key={type}
                                        onClick={() =>
                                            setSelectedTypes(prev =>
                                                prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
                                            )
                                        }
                                        style={{
                                            padding: '5px',
                                            borderRadius: '4px',
                                            border: selectedTypes.includes(type) ? '2px solid #c4302b' : '1px solid #ccc',
                                            backgroundColor: selectedTypes.includes(type) ? '#fbecec' : '#fff',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '32px',
                                            height: '32px',
                                            boxSizing: 'border-box'
                                        }}
                                        title={alt}
                                    >
                                        <Image
                                            aria-hidden
                                            src={icon}
                                            alt={alt}
                                            width={19}
                                            height={17}
                                            style={{ width: "19px", height: "17px" }}
                                        />
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
                {filteredTimecodes.length > 0 ?
                    <div
                        id="grid-timecodes"
                        ref={timecodesGridRef}
                        style={props.script ?
                            { backgroundColor: "rgba(231, 231, 231)", padding: '0 16px 16px 64px', display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', maxHeight: "calc(100vh - 142px)", overflowY: 'auto', overflowX: 'hidden', boxSizing: 'border-box', width: '100%' }
                            :
                            { backgroundColor: "rgba(231, 231, 231)", padding: '0 16px 16px 16px', display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', maxHeight: "calc(100vh - 142px)", overflowY: 'auto', overflowX: 'hidden', boxSizing: 'border-box', width: '100%' }
                        }
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                    >
                        {filteredTimecodes.map((card, timecodeId) => (
                            <div
                                key={timecodeId}
                                className="card"
                                draggable="true"
                                onDragStart={e => handleDragStart(e, card)}
                                onDragEnd={handleDragEnd}
                            >
                                <TimecodeCard
                                    id={timecodeId}
                                    timecode={card}
                                    updateTimecode={updatedTimecode => updateTimecode(updatedTimecode)}
                                    setActiveMenu={setActiveMenu}
                                    activeMenu={activeMenu}
                                    ratingChanged={(timecode, rating) => ratingChanged(timecode, rating)}
                                    type="timecode"
                                    views={views}
                                    cardType="timecode"
                                    projectName={projectName}
                                    fetchTimecodes={fetchTimecodes}
                                    setIsDraggingOverTextarea={setIsDraggingOverTextarea}
                                    base64Map={base64Map}
                                />
                            </div>
                        ))}
                    </div>
                    : !projectName ?
                        <p style={props.script ? { padding: '24px 24px 24px 72px', margin: 0, width: 'calc(40% - 48px)' } : { padding: '24px', margin: 0 }}>
                            Nenhum projeto selecionado
                        </p>
                        :
                        <p style={props.script ? { padding: '24px 24px 24px 72px', margin: 0, width: 'calc(40% - 48px)' } : { padding: '24px', margin: 0 }}>
                            Nenhum timecode
                        </p>
                }
            </div>
            {props.script &&
                <div style={{ width: '60%', height: 'calc(100vh - 77px)' }}>
                    <div ref={filterRef} style={{ backgroundColor: "rgb(242, 242, 242)", padding: '16px 16px 12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "8px 16px",
                                backgroundColor: '#c4302b',
                                color: '#fff',
                                border: 'none',
                                borderRadius: "4px",
                                cursor: 'pointer'
                            }}
                            onClick={() => {
                                setVisualizationDropdownOpen(prev => !prev);
                            }}
                        >
                            <p style={{ color: 'white', margin: 0 }}>Visualizar</p>
                        </button>

                        {visualizationDropdownOpen && (
                            <div
                                style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '8px',
                                    padding: '0',
                                }}
                            >
                                {[
                                    { key: 'classification-view', label: 'Classificação' },
                                    { key: 'description-view', label: 'Descrição' },
                                    { key: 'takes-view', label: 'Takes' },
                                    { key: 'audios-view', label: 'Audios' },
                                    { key: 'audio-view', label: 'Áudio' },
                                    { key: 'locution-view', label: 'Locução' }
                                ].map(({ key, label }) => (
                                    <div
                                        key={key}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleView(key);
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            backgroundColor: 'white',
                                            border: '1px solid #ccc',
                                            cursor: 'pointer',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <Image
                                            src={views[key] === 'show' ? 'eye2-on.svg' : 'eye2-off.svg'}
                                            alt={label}
                                            width={18}
                                            height={18}
                                            style={{ width: "18px", height: "18px" }}
                                        />
                                        <span style={{ fontSize: '12px', color: '#222', userSelect: 'none' }}>{label}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div
                        className="grid-scripts"
                        style={{
                            width: '100%',
                            backgroundColor: "rgb(242,242,242)",
                            height: gridHeight,
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            padding: '4px 0 0 0',
                        }}
                    >
                        {scripts.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '24px 0' }}>
                                <span>Nenhuma cena. Para adicionar utilize o botão abaixo.</span>
                                <span onClick={() => addScene(0)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', backgroundColor: '#000', borderRadius: '50%', cursor: 'pointer' }}>
                                    <Image src="/plus.svg" alt="Plus" width={12} height={12} style={{ width: "12px", height: "12px" }} />
                                </span>
                            </div>
                        ) : (
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    padding: '0 16px 16px 16px',
                                }}
                            >
                                {scripts.map((script, id) => (
                                    <div key={id}>
                                        <div className='scene-card'>
                                            <div className='scene-header' style={{ display: "flex", justifyContent: 'space-between', alignItems: 'center', borderTopRightRadius: '8px', borderTopLeftRadius: '8px', padding: '12px' }}>
                                                <p style={{ fontSize: "16px", color: 'black', margin: 0 }}>{script.name}</p>
                                                <div style={{ display: "flex", gap: '16px', fontSize: "18px", position: 'relative' }}>
                                                    <AnimatePresence>
                                                        {((script.activeFields.length === 0) || dropdownOpen === id) && (
                                                            <motion.div
                                                                initial={{ x: '40px', opacity: 0 }}
                                                                animate={{ x: 0, opacity: 1 }}
                                                                exit={{ x: '40px', opacity: 0 }}
                                                                transition={{ type: 'tween', duration: 0.2 }}
                                                                style={{
                                                                    position: 'absolute',
                                                                    top: '-7px',
                                                                    right: '110px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '12px',
                                                                    borderRadius: '8px',
                                                                    padding: '8px',
                                                                    zIndex: 10,
                                                                }}
                                                            >
                                                                {views['description-view'] === 'show' &&
                                                                    <div
                                                                        onClick={() => {
                                                                            setDropdownOpen(id);
                                                                            changeScene(script, 'description', false);
                                                                        }}
                                                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0px', cursor: 'pointer' }}
                                                                    >
                                                                        <Image src={script.activeFields.includes('description') ? "/description-active.svg" : "/description.svg"} alt="Descrição" width={14} height={14} style={{ width: "14px", height: "14px" }} />
                                                                        <span style={{ fontSize: '13px', color: 'black' }}>Descrição</span>
                                                                    </div>
                                                                }
                                                                {views['takes-view'] === 'show' &&
                                                                    <div
                                                                        onClick={() => {
                                                                            setDropdownOpen(id);
                                                                            changeScene(script, 'takes', false)
                                                                        }}
                                                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0px', cursor: 'pointer' }}
                                                                    >
                                                                        <Image src={script.activeFields.includes('takes') ? "/V-active.svg" : "/V.svg"} alt="Takes" width={14} height={14} style={{ width: "14px", height: "14px" }} />
                                                                        <span style={{ fontSize: '13px', color: 'black' }}>Takes</span>
                                                                    </div>
                                                                }
                                                                {views['audio-view'] === 'show' &&
                                                                    <div
                                                                        onClick={() => {
                                                                            setDropdownOpen(id);
                                                                            changeScene(script, 'audio', false)
                                                                        }}
                                                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0px', cursor: 'pointer' }}
                                                                    >
                                                                        <Image src={script.activeFields.includes('audio') ? "/A-active.svg" : "/A.svg"} alt="Áudio" width={14} height={14} style={{ width: "14px", height: "14px" }} />
                                                                        <span style={{ fontSize: '13px', color: 'black' }}>Áudio</span>
                                                                    </div>
                                                                }
                                                                {views['locution-view'] === 'show' &&
                                                                    <div
                                                                        onClick={() => {
                                                                            setDropdownOpen(id);
                                                                            changeScene(script, 'locution', false)
                                                                        }}
                                                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0px', cursor: 'pointer' }}
                                                                    >
                                                                        <Image src={script.activeFields.includes('locution') ? "/locution-active.svg" : "/locution.svg"} alt="Locução" width={14} height={14} style={{ width: "14px", height: "14px" }} />
                                                                        <span style={{ fontSize: '13px', color: 'black' }}>Locução</span>
                                                                    </div>
                                                                }
                                                                {/** script.timecodes.filter(timecode => timecode.type === 'AV').length === 0 && **/}
                                                                {views['audios-view'] === 'show' &&
                                                                    <div
                                                                        onClick={() => {
                                                                            setDropdownOpen(id);
                                                                            changeScene(script, 'audios', false)
                                                                        }}
                                                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0px', cursor: 'pointer' }}
                                                                    >
                                                                        <Image src={script.activeFields.includes('audios') ? "/A-active.svg" : "/A.svg"} alt="Áudio" width={14} height={14} style={{ width: "14px", height: "14px" }} />
                                                                        <span style={{ fontSize: '13px', color: 'black' }}>Áudios</span>
                                                                    </div>
                                                                }
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                    <Image
                                                        aria-hidden
                                                        src="/plus-black.svg"
                                                        alt="Adicionar elementos"
                                                        width={20}
                                                        height={20}
                                                        style={{ width: "20px", height: "20px", cursor: 'pointer' }}
                                                        priority
                                                        onClick={() => toggleDropdown(id)}
                                                    />
                                                    <Image
                                                        aria-hidden
                                                        src="/move.svg"
                                                        alt="Mover cena"
                                                        width={20}
                                                        height={20}
                                                        style={{ width: "20px", height: "20px", cursor: 'pointer', marginRight: '4px' }}
                                                        priority
                                                        onClick={() => toggleMoveDropdown(id)}
                                                    />
                                                    <Image
                                                        aria-hidden
                                                        src="/trash.svg"
                                                        alt="Deletar cena"
                                                        width={20}
                                                        height={20}
                                                        style={{ width: "20px", height: "20px", cursor: 'pointer' }}
                                                        priority
                                                        onClick={() => removeScene(id)}
                                                    />
                                                    {moveDropdownOpen === id && (
                                                        <div style={{
                                                            width: 'auto',
                                                            position: 'absolute',
                                                            top: '36px',
                                                            right: '0',
                                                            backgroundColor: 'white',
                                                            border: '1px solid #ccc',
                                                            borderRadius: '8px',
                                                            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                                                            zIndex: '10',
                                                            padding: '8px 12px',
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', padding: '8px 0px', borderRadius: '4px' }}>
                                                                {/**<span style={{ fontSize: '14px', width: '100px' }}>Mover para:</span>**/}
                                                                <ScriptSelector scripts={scripts} setMoveSceneId={setMoveSceneId} />
                                                                <button
                                                                    alt="Descrição"
                                                                    style={{
                                                                        padding: "8px 14px",
                                                                        cursor: 'pointer',
                                                                        marginLeft: '12px',
                                                                        border: "none",
                                                                        borderRadius: "4px",
                                                                        backgroundColor: "rgb(18, 14, 35)",
                                                                        color: "#fff",
                                                                        fontSize: "12px",
                                                                        fontWeight: "600",
                                                                    }}
                                                                    onClick={() => moveSceneId ? moveSceneById(moveSceneId, id) : toast.warn("Preencha a cena")}
                                                                >
                                                                    MOVER
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {script.activeFields.length === 0 ?
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 0' }}><span>Adicione <b>elementos</b> na cena e comece sua história!</span></div>
                                                :
                                                <div style={{ display: 'flex', gap: '16px', padding: '16px' }}>
                                                    <div style={{ width: "60%", display: 'flex', flexDirection: "column", gap: '8px' }}>
                                                        {script.activeFields.includes('description') && views['description-view'] === 'show' &&
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '9px 12px', border: '0.5px solid rgb(188, 188, 188)', borderRadius: '4px' }}>
                                                                <Image src="/description.svg" alt="Descrição" width={16} height={16} style={{ width: "18px", height: "17px" }} />
                                                                <ScriptInput placeholder='Descrição' value={script.description} onChange={value => changeScene(script, 'description', true, value)} script={script} />
                                                            </div>
                                                        }
                                                        {script.activeFields.includes('takes') && views['takes-view'] === 'show' &&
                                                            <div
                                                                className='dashed-area'
                                                                style={
                                                                    script.timecodes.filter(timecode => timecode.type === 'AV').length === 0 ?
                                                                        {
                                                                            padding: '8px 12px',
                                                                            border: '1px dashed rgb(158, 156, 168)',
                                                                            borderRadius: '4px',
                                                                        }
                                                                        :
                                                                        {
                                                                            padding: '8px 12px',
                                                                            borderRadius: "6px",
                                                                            border: '1px dashed rgb(158, 156, 168)',
                                                                            marginTop: 'auto'
                                                                        }
                                                                }
                                                            >
                                                                {script.timecodes.length === 0 ?
                                                                    <div
                                                                        id={`grid-scripts-${id}`}
                                                                        style={{ position: 'relative', minHeight: '90px', display: 'grid', gap: '1rem' }}
                                                                        onDragOver={handleDragOver}
                                                                        onDrop={handleDrop}
                                                                    >
                                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', position: 'absolute', width: '100%', height: '100%' }}>
                                                                            <Image src="/V.svg" alt="Vídeo" width={16} height={16} style={{ width: "16px", height: "16px" }} />
                                                                            <span style={{ fontSize: '12px', color: 'rgb(158, 156, 168)' }}>Takes</span>
                                                                        </div>
                                                                    </div>
                                                                    :
                                                                    <div
                                                                        key={id}
                                                                        style={{
                                                                            gridTemplateColumns: script.timecodes.filter(timecode => timecode.type === 'AV').length === 0 ? 'repeat(2, 1fr)' : '1fr 1fr',
                                                                            display: 'grid',
                                                                            gap: '1rem'
                                                                        }}
                                                                        id={`grid-scripts-${id}`}
                                                                        onDragOver={handleDragOver}
                                                                        onDrop={handleDrop}
                                                                    >
                                                                        {script.timecodes.map((timecode, scriptTimecodeId) => (
                                                                            <div
                                                                                key={scriptTimecodeId}
                                                                                className="card script"
                                                                                draggable="true"
                                                                                onDragStart={e => handleDragStart(e, timecode)}
                                                                                onDragEnd={handleDragEnd}
                                                                            >
                                                                                <TimecodeCard
                                                                                    id={scriptTimecodeId}
                                                                                    timecode={timecode}
                                                                                    updateTimecode={updatedTimecode => updateTimecode(updatedTimecode, "script-timecodes", script)}
                                                                                    setActiveMenu={setActiveMenu}
                                                                                    activeMenu={activeMenu}
                                                                                    ratingChanged={(timecode, rating) => ratingChanged(timecode, rating, "script-timecodes")}
                                                                                    type={timecode.type === 'AV' ? "AV" : "script"}
                                                                                    views={views}
                                                                                    cardType="script"
                                                                                    projectName={projectName}
                                                                                    fetchTimecodes={fetchTimecodes}
                                                                                    setIsDraggingOverTextarea={setIsDraggingOverTextarea}
                                                                                    base64Map={base64Map}
                                                                                />
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                }
                                                            </div>
                                                        }
                                                    </div>
                                                    <div style={{ width: "40%", display: 'flex', flexDirection: "column", gap: '8px' }}>
                                                        {script.activeFields.includes('audio') && views['audio-view'] === 'show' &&
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '9px 12px', border: '0.5px solid rgb(188, 188, 188)', borderRadius: '4px' }}>
                                                                <Image src="/A.svg" alt="Áudio" width={16} height={16} style={{ width: "16px", height: "16px" }} />
                                                                <ScriptInput placeholder='Áudio' value={script.audio} onChange={value => changeScene(script, 'audio', true, value)} script={script} />
                                                            </div>
                                                        }
                                                        {script.activeFields.includes('locution') && views['locution-view'] === 'show' &&
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '9px 12px', border: '0.5px solid rgb(188, 188, 188)', borderRadius: '4px' }}>
                                                                <Image src="/locution.svg" alt="Locução" width={16} height={16} style={{ width: "16px", height: "16px" }} />
                                                                <ScriptInput placeholder='Locução' value={script.locution} onChange={value => changeScene(script, 'locution', true, value)} script={script} />
                                                            </div>
                                                        }
                                                        {script.activeFields.includes('audios') && script.timecodes.filter(timecode => timecode.type === 'AV').length === 0 && views['audios-view'] === 'show' &&
                                                            <div
                                                                className='dashed-area'
                                                                style={{
                                                                    padding: '8px 12px',
                                                                    border: script.timecodes.length === 0 ? '1px dashed rgb(158, 156, 168)' : '1px dashed rgb(158, 156, 168)',
                                                                    borderRadius: '4px',
                                                                }}
                                                            >
                                                                {script.audios.length === 0 ?
                                                                    <div
                                                                        id={`grid-audios-${id}`}
                                                                        style={{ position: 'relative', minHeight: '90px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}
                                                                        onDragOver={handleDragOver}
                                                                        onDrop={handleDrop}
                                                                    >
                                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', position: 'absolute', width: '100%', height: '100%' }}>
                                                                            <Image src="/A.svg" alt="Vídeo" width={16} height={16} style={{ width: "16px", height: "16px" }} />
                                                                            <span style={{ fontSize: '12px', color: 'rgb(158, 156, 168)' }}>Áudios</span>
                                                                        </div>
                                                                    </div>
                                                                    :
                                                                    <div
                                                                        key={id}
                                                                        style={{
                                                                            display: 'grid',
                                                                            gridTemplateColumns: 'repeat(3, 1fr)',
                                                                            gap: '1rem'
                                                                        }}
                                                                        id={`grid-audios-${id}`}
                                                                        onDragOver={handleDragOver}
                                                                        onDrop={handleDrop}
                                                                    >
                                                                        {script.audios.map((audio, scriptAudioId) => {
                                                                            return (
                                                                                <div
                                                                                    key={scriptAudioId}
                                                                                    className="card script"
                                                                                    draggable="true"
                                                                                    onDragStart={e => handleDragStart(e, audio)}
                                                                                    onDragEnd={handleDragEnd}
                                                                                >
                                                                                    <TimecodeCard
                                                                                        id={scriptAudioId}
                                                                                        timecode={audio}
                                                                                        updateTimecode={updatedTimecode => updateTimecode(updatedTimecode, "script-audios", script)} //AQUI
                                                                                        setActiveMenu={setActiveMenu}
                                                                                        activeMenu={activeMenu}
                                                                                        ratingChanged={(timecode, rating) => ratingChanged(timecode, rating, "script-audios")} // AQUI
                                                                                        type="audio"
                                                                                        views={views}
                                                                                        cardType="script"
                                                                                        projectName={projectName}
                                                                                        fetchTimecodes={fetchTimecodes}
                                                                                        setIsDraggingOverTextarea={setIsDraggingOverTextarea}
                                                                                        base64Map={base64Map}
                                                                                    />
                                                                                </div>
                                                                            )
                                                                        })}
                                                                    </div>
                                                                }
                                                            </div>
                                                        }
                                                        {script.timecodes.map((timecode, scriptTimecodeId) => {
                                                            if (script.activeFields.includes('audios') && views['audios-view'] === 'show' && timecode.type === 'AV') {
                                                                return (
                                                                    <div key={scriptTimecodeId}>
                                                                        <TimecodeCard
                                                                            id={scriptTimecodeId}
                                                                            timecode={timecode}
                                                                            updateTimecode={updatedTimecode => updateTimecode(updatedTimecode, "script-timecodes", script)} //AQUI
                                                                            setActiveMenu={setActiveMenu}
                                                                            activeMenu={activeMenu}
                                                                            ratingChanged={(timecode, rating) => ratingChanged(timecode, rating, "script-timecodes")} // AQUI
                                                                            type="AV-audio"
                                                                            views={views}
                                                                            cardType="script"
                                                                            projectName={projectName}
                                                                            fetchTimecodes={fetchTimecodes}
                                                                            base64Map={base64Map}
                                                                        />
                                                                    </div>
                                                                )
                                                            }
                                                        })}
                                                    </div>
                                                </div>
                                            }
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', margin: '12px 0' }}>
                                            <span onClick={() => addScene(id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', backgroundColor: '#000', borderRadius: '50%', cursor: 'pointer' }}>
                                                <Image src="/plus.svg" alt="Plus" width={10} height={10} style={{ width: "10px", height: "10px" }} />
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            }
            <ToastContainer
                position="bottom-right"
                autoClose={5000}
                closeOnClick={true}
                pauseOnHover={true}
                draggable={false}
            />
        </div>
    );
};

export default TimecodesSection;
