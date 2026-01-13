import React, { useState } from 'react';

interface SatelliteBrickProps {
    id: string;
    title: string;
    content: string;
    type: 'recommendation' | 'info' | 'warning' | 'protocol' | 'success';
    style?: React.CSSProperties;
}

const TYPE_COLORS = {
    recommendation: 'border-blue-500 bg-blue-900/40 text-blue-100',
    info: 'border-gray-500 bg-gray-900/40 text-gray-100',
    warning: 'border-red-500 bg-red-900/40 text-red-100',
    protocol: 'border-purple-500 bg-purple-900/40 text-purple-100',
    success: 'border-green-500 bg-green-900/40 text-green-100',
};

const TYPE_ICONS = {
    recommendation: '💡',
    info: 'ℹ️',
    warning: '⚠️',
    protocol: '📋',
    success: '✅',
};

export const SatelliteBrick: React.FC<SatelliteBrickProps> = ({ title, content, type, style }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className={`
        pointer-events-auto 
        absolute 
        flex flex-row items-center 
        transition-all duration-300 ease-out
        backdrop-blur-xl border-l-4 
        shadow-[0_8px_32px_rgba(0,0,0,0.5)]
        animate-slide-in-right
        ${TYPE_COLORS[type]}
        ${isHovered
                    ? 'w-80 p-4 rounded-r-xl border-white/20'
                    : 'w-12 h-12 p-0 rounded-2xl justify-center cursor-pointer opacity-90 hover:opacity-100 hover:scale-110'
                }
      `}
            style={{
                ...style,
                boxShadow: isHovered ? '0 0 20px rgba(var(--neon-color), 0.3)' : undefined
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="flex-shrink-0 text-2xl filter drop-shadow-md transform transition-transform duration-300">
                {TYPE_ICONS[type]}
            </div>

            {/* Content only visible on hover */}
            <div className={`
        ml-3 overflow-hidden transition-opacity duration-300
        ${isHovered ? 'opacity-100' : 'opacity-0 w-0 h-0'}
      `}>
                <h3 className="font-bold text-sm mb-1 uppercase tracking-wider opacity-80">{title}</h3>
                <p className="text-xs leading-relaxed">{content}</p>
            </div>
        </div>
    );
};
