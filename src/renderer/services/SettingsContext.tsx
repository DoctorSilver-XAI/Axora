import React, { createContext, useContext, useState, ReactNode } from 'react';

export type SidecarVariant = 'classic' | 'dynamic-island';
export type PhiVisionDisplayMode = 'floating' | 'anchored' | 'fullscreen';

export interface AppSettings {
    sidecarVariant: SidecarVariant;
    phivisionDisplayMode: PhiVisionDisplayMode;
}

const DEFAULT_SETTINGS: AppSettings = {
    sidecarVariant: 'dynamic-island',
    phivisionDisplayMode: 'floating'
};

interface SettingsContextType {
    settings: AppSettings;
    updateSettings: (newSettings: Partial<AppSettings>) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
    const [settings, setSettings] = useState<AppSettings>(() => {
        try {
            const stored = localStorage.getItem('axora_settings');
            return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
        } catch (e) {
            console.error('Failed to load settings', e);
            return DEFAULT_SETTINGS;
        }
    });

    const updateSettings = (newSettings: Partial<AppSettings>) => {
        setSettings(prev => {
            const next = { ...prev, ...newSettings };
            localStorage.setItem('axora_settings', JSON.stringify(next));
            return next;
        });
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
