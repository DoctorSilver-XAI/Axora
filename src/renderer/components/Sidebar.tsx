import { NavLink } from 'react-router-dom';
import { MessageSquare, GraduationCap, Pill, Settings, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen, LogOut } from 'lucide-react';
import { useAuth } from '../services/AuthContext';
import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AxoraLogo } from './AxoraLogo';

import { usePhiVision } from '../services/PhiVisionContext';
import { PhiVisionButton } from './PhiVisionButton';

export function Sidebar() {
    const { togglePhiVision, triggerAnalysis, isActive, isAnalyzing } = usePhiVision();
    const { user, profile, signOut } = useAuth();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Derive user display info from auth context
    const userEmail = user?.email ?? 'Non connecté';
    const userInitials = user?.email?.slice(0, 2).toUpperCase() ?? '??';
    const displayName = profile?.displayName ?? userEmail.split('@')[0];

    // Keyboard Shortcut: Cmd+Shift+P to Trigger PhiVision
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'P') {
                if (!isActive) togglePhiVision();
                triggerAnalysis();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isActive, togglePhiVision, triggerAnalysis]);

    const mainLinks = [
        { to: '/assistant', icon: MessageSquare, label: 'Assistant' },
        { to: '/', icon: Pill, label: 'Outils Pharmacie' },
        { to: '/phivision-lab', icon: GraduationCap, label: 'PhiVision Lab' },
    ];

    const hiddenLinks = [
        { to: '/settings', icon: Settings, label: 'Paramètres' },
    ];

    return (
        <motion.div
            initial={false}
            animate={{ width: isCollapsed ? 80 : 256 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="h-screen bg-[#1a1c2e]/90 border-r border-[#2d323b] flex flex-col backdrop-blur-xl relative overflow-hidden shrink-0"
            onMouseEnter={() => {
                window.axora?.setIgnoreMouse(false);
            }}
            onMouseLeave={() => {
                window.axora?.setIgnoreMouse(true);
            }}
        >
            {/* Header */}
            <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} window-drag-region`}>
                <AxoraLogo size={isCollapsed ? 32 : 42} />
                <AnimatePresence>
                    {!isCollapsed && (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="flex flex-col overflow-hidden whitespace-nowrap"
                        >
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 leading-none">
                                Axora Pro
                            </span>
                            <span className="text-[10px] text-indigo-400 font-medium tracking-wider mt-1">
                                PHIGENIX 6.0
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Action Button (PhiVision) */}
            <div className="px-4 mb-4">
                <PhiVisionButton showLabel={!isCollapsed} size="md" />
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-2">
                {!isCollapsed && (
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2 whitespace-nowrap">
                        Workspace
                    </div>
                )}
                {mainLinks.map((link) => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        title={isCollapsed ? link.label : ""}
                        className={({ isActive }) =>
                            `flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl transition-all duration-200 group ${isActive
                                ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/10'
                                : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                            }`
                        }
                    >
                        <link.icon size={20} />
                        {!isCollapsed && <span className="font-medium whitespace-nowrap">{link.label}</span>}
                        {!isCollapsed && link.to === '/' && (
                            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Collapse Toggle */}
            <div className="px-4 py-2 border-t border-[#2d323b] flex justify-end">
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                >
                    {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                </button>
            </div>


            {/* User / Settings Footer*/}
            <div className="p-4 border-t border-[#2d323b] relative">
                <AnimatePresence>
                    {showUserMenu && !isCollapsed && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute bottom-full left-4 right-4 mb-2 bg-[#1a1c2e] border border-[#2d323b] rounded-xl shadow-2xl overflow-hidden z-50 p-1 window-no-drag"
                        >

                            {hiddenLinks.map((link) => (
                                <NavLink
                                    key={link.to}
                                    to={link.to}
                                    onClick={() => setShowUserMenu(false)}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${isActive
                                            ? 'bg-indigo-600/10 text-indigo-400'
                                            : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                                        }`
                                    }
                                >
                                    <link.icon size={16} />
                                    <span className="font-medium">{link.label}</span>
                                </NavLink>
                            ))}

                            {/* Logout Button */}
                            <button
                                onClick={() => {
                                    setShowUserMenu(false);
                                    signOut();
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors text-sm"
                            >
                                <LogOut size={16} />
                                <span className="font-medium">Déconnexion</span>
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className={`flex items-center ${isCollapsed ? 'flex-col gap-4' : 'gap-3'}`}>
                    <button
                        onClick={() => !isCollapsed && setShowUserMenu(!showUserMenu)}
                        className={`flex items-center gap-3 w-full p-2 rounded-xl transition-colors text-left group ${showUserMenu && !isCollapsed ? 'bg-white/5' : 'hover:bg-white/5'} ${isCollapsed ? 'justify-center' : ''}`}
                    >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white border border-white/20 group-hover:border-white/30 shrink-0 shadow-lg shadow-indigo-500/20">
                            {userInitials}
                        </div>
                        {!isCollapsed && (
                            <div className="flex-1 overflow-hidden">
                                <div className="text-sm font-medium text-gray-200 truncate">{displayName}</div>
                                <div className="text-xs text-emerald-400 truncate flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                    Connecté
                                </div>
                            </div>
                        )}
                    </button>
                    {!isCollapsed && (
                        <button
                            onClick={() => {
                                if (window.axora) window.axora.setMode('compact');
                            }}
                            title="Réduire en Sidecar (Widget)"
                            className="flex items-center justify-center p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                        >
                            <div className="w-5 h-5 border-2 border-current rounded-md flex items-center justify-center">
                                <div className="w-2 h-0.5 bg-current" />
                            </div>
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
