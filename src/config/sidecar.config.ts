/**
 * @file sidecar.config.ts
 * @description Configuration centrale pour le composant Sidecar (barre latérale flottante).
 * Ce fichier permet de contrôler l'apparence, la position et le comportement de la fenêtre.
 */

// =========================================================================
// VARIANTS DEFINITIONS
// =========================================================================

export const ClassicVariant = {
    visual: { width: 68, height: 220, borderRadius: 34 },
    window: { width: 80, height: 300 },
    position: {
        yAxisAlign: 'upper-quarter',
        margins: { right: 0, top: 20, bottom: 20 },
        // @ts-ignore
        xAxisAlign: 'right'
    }
};

export const DynamicIslandVariant = {
    visual: { width: 120, height: 36, borderRadius: 20 },
    window: { width: 450, height: 200 },
    position: {
        yAxisAlign: 'top',
        // @ts-ignore
        xAxisAlign: 'center',
        margins: { top: 12, right: 0, bottom: 0 }
    }
};

// Default Configuration (fallback)
const DEFAULT_VARIANT = 'dynamic-island';

export const SidecarConfig = {
    // Expose the variant keyword for the Renderer to know which component to mount by default
    variant: DEFAULT_VARIANT,

    // Merge default variant
    ...(DEFAULT_VARIANT === 'dynamic-island' ? DynamicIslandVariant : ClassicVariant),

    theme: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        borderColor: 'rgba(255, 255, 255, 0.15)',
        blurIntensity: 20,
        shadow: {
            enabled: true,
            color: 'rgba(0, 0, 0, 0.6)',
            size: '0 4px 12px',
        }
    },

    behavior: {
        isDraggable: true,
        hoverAnimation: {
            scale: 1.0,
            duration: '0.3s',
        }
    }
};


