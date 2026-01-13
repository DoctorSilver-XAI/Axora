import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { useSettings } from '../services/SettingsContext';

export function DashboardLayout() {
    const { settings } = useSettings();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (window.axora) window.axora.setMode('compact', settings.sidecarVariant);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [settings.sidecarVariant]);

    return (
        <div className="flex h-screen bg-[#0f1115] text-white font-sans overflow-hidden print:h-auto print:block print:bg-white print:overflow-visible">
            <div className="print:hidden">
                <Sidebar />
            </div>
            <main className="flex-1 overflow-hidden relative print:overflow-visible print:h-auto print:static">
                {/* Ambient background glow - hidden on print */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent opacity-50 print:hidden" />

                <div className="relative z-10 w-full h-full overflow-auto custom-scrollbar print:overflow-visible print:h-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
