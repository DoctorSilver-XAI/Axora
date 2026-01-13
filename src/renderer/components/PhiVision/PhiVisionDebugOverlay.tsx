import React, { useState, useEffect, useRef } from 'react';
import { usePhiVision } from '../../services/PhiVisionContext';

export const PhiVisionDebugOverlay: React.FC = () => {
    const { result, closePhiVision } = usePhiVision();
    const [showOcr, setShowOcr] = useState(false);

    // Dragging state
    const [position, setPosition] = useState({ x: 50, y: 30 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

    const data = result as any;

    // Handle Escape Key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                closePhiVision();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [closePhiVision]);

    // Handle dragging with mouse events
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            posX: position.x,
            posY: position.y
        };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            const dx = e.clientX - dragStartRef.current.x;
            const dy = e.clientY - dragStartRef.current.y;
            setPosition({
                x: Math.max(0, dragStartRef.current.posX + dx),
                y: Math.max(0, dragStartRef.current.posY + dy)
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    if (!data) return null;

    return (
        // Full screen container with semi-transparent backdrop
        <div
            className="fixed inset-0 z-[99999] bg-black/60"
            onClick={(e) => {
                // Only close if clicking the backdrop itself
                if (e.target === e.currentTarget) {
                    closePhiVision();
                }
            }}
        >
            {/* Modal Window */}
            <div
                className="absolute bg-[#0f172a] rounded-xl shadow-2xl flex flex-col border border-slate-600 overflow-hidden"
                style={{
                    left: position.x,
                    top: position.y,
                    width: '850px',
                    height: '550px',
                    maxWidth: 'calc(100vw - 100px)',
                    maxHeight: 'calc(100vh - 60px)'
                }}
                onClick={(e) => e.stopPropagation()}  // Prevent clicks inside modal from closing it
            >
                {/* Draggable Header */}
                <div
                    className="flex justify-between items-center px-4 py-2 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-900 cursor-grab active:cursor-grabbing select-none"
                    onMouseDown={handleMouseDown}
                    style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                >
                    <div className="flex items-center gap-3">
                        <h1 className="text-base font-bold text-emerald-400">PhiVision</h1>
                        <span className="text-slate-500 text-sm">DEBUG</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                            {data._archiveMetadata?.processingTimeMs ?? '?'}ms
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">ESC ou clic dehors pour fermer</span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                closePhiVision();
                            }}
                            className="w-7 h-7 flex items-center justify-center hover:bg-red-500/20 rounded transition-colors text-slate-400 hover:text-red-400"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="flex-1 overflow-hidden grid grid-cols-2">

                    {/* LEFT: JSON Data */}
                    <div className="flex flex-col border-r border-slate-700 min-h-0 bg-[#0f172a]">
                        <div className="flex-1 overflow-auto p-3">
                            <h2 className="text-[10px] font-bold text-blue-400 mb-2 uppercase">🧠 JSON Output</h2>
                            <pre className="text-[10px] text-blue-100 font-mono whitespace-pre-wrap leading-relaxed">
                                {JSON.stringify(data, (key, value) => {
                                    if (key === 'capturedImage' || key === '_archiveMetadata') return undefined;
                                    return value;
                                }, 2)}
                            </pre>
                        </div>

                        {/* Flags Panel */}
                        <div className="h-24 border-t border-slate-700 p-3 bg-slate-900/30 overflow-auto">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <h3 className="text-[9px] font-bold text-amber-500 uppercase mb-1">Flags</h3>
                                    <div className="flex flex-wrap gap-1">
                                        {data.flags?.map((flag: string, i: number) => (
                                            <span key={i} className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[9px] font-mono rounded">
                                                {flag}
                                            </span>
                                        ))}
                                        {!data.flags?.length && <span className="text-slate-600 text-[10px]">—</span>}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-[9px] font-bold text-red-400 uppercase mb-1">Missing</h3>
                                    <div className="text-[10px] text-red-300 font-mono">
                                        {data.missing_fields?.length ? data.missing_fields.join(', ') : <span className="text-emerald-500">✓</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Image & OCR */}
                    <div className="flex flex-col min-h-0 bg-black">
                        {/* Image Preview */}
                        <div className="h-[55%] relative border-b border-slate-800 bg-slate-950">
                            {data.capturedImage ? (
                                <img src={data.capturedImage} alt="Capture" className="w-full h-full object-contain" />
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-600">No Image</div>
                            )}
                        </div>

                        {/* OCR Text */}
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="flex justify-between items-center px-3 py-1 border-b border-slate-800 bg-[#111]">
                                <span className="text-[9px] font-bold text-purple-400 uppercase">👁️ OCR</span>
                                <button
                                    onClick={() => setShowOcr(!showOcr)}
                                    className="text-[9px] px-2 py-0.5 bg-slate-700 text-slate-300 rounded hover:bg-slate-600"
                                >
                                    {showOcr ? 'Masquer' : 'Afficher'}
                                </button>
                            </div>

                            <div className="flex-1 overflow-auto p-2 bg-[#0a0a0a]">
                                {showOcr ? (
                                    <pre className="text-[9px] text-slate-400 font-mono whitespace-pre-wrap">
                                        {data._archiveMetadata?.ocrTextRaw || data.ocrText || "Aucun texte"}
                                    </pre>
                                ) : (
                                    <div className="flex items-center justify-center h-full">
                                        <button onClick={() => setShowOcr(true)} className="text-slate-600 hover:text-purple-400 text-xs">
                                            Cliquer pour afficher le texte OCR
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
