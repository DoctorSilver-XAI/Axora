import React from 'react';
import { StatusDot } from './StatusDot';

export interface PatientData {
    nom: string;
    prenom: string;
    nir?: string;
    rangGemellaire?: number;
    droitsAMO?: {
        status: 'valid' | 'expiring' | 'expired' | 'unknown';
        dateExpiration?: string;
    };
}

interface PatientToastProps {
    patient: PatientData;
    onDismiss?: () => void;
    className?: string;
}

/**
 * PatientToast - Displays patient information after Carte Vitale read
 * Used in Sidecar mode as a quick notification
 */
export const PatientToast: React.FC<PatientToastProps> = ({
    patient,
    onDismiss,
    className = ''
}) => {
    const getDroitsStatus = () => {
        if (!patient.droitsAMO) return { color: 'var(--text-secondary)', label: 'Droits inconnus', status: 'unknown' as const };

        switch (patient.droitsAMO.status) {
            case 'valid':
                return { color: 'var(--neon-green)', label: 'Droits à jour', status: 'connected' as const };
            case 'expiring':
                return { color: 'var(--neon-cyan)', label: 'Expire bientôt', status: 'busy' as const };
            case 'expired':
                return { color: 'var(--neon-alert)', label: 'Droits expirés', status: 'alert' as const };
            default:
                return { color: 'var(--text-secondary)', label: 'Droits inconnus', status: 'disconnected' as const };
        }
    };

    const droitsInfo = getDroitsStatus();
    const fullName = `${patient.prenom} ${patient.nom.toUpperCase()}`;
    const greeting = getGreeting();

    function getGreeting(): string {
        const hour = new Date().getHours();
        if (hour < 12) return 'Bonjour';
        if (hour < 18) return 'Bon après-midi';
        return 'Bonsoir';
    }

    return (
        <div
            className={`animate-slide-in-right ${className}`}
            role="alert"
            aria-live="polite"
            style={{
                background: 'var(--glass-bg-dark)',
                backdropFilter: 'var(--backdrop-blur)',
                WebkitBackdropFilter: 'var(--backdrop-blur)',
                border: '1px solid var(--glass-border)',
                borderRadius: '16px',
                padding: '16px',
                minWidth: '200px',
                maxWidth: '280px',
                boxShadow: '0 0 20px rgba(0, 242, 255, 0.1), var(--glass-shadow)'
            }}
        >
            {/* Header with dismiss */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
            }}>
                <span style={{
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    color: 'var(--text-secondary)'
                }}>
                    Carte Vitale
                </span>
                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        aria-label="Fermer la notification"
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontSize: '14px',
                            padding: '4px',
                            opacity: 0.6,
                            transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Patient Name */}
            <div style={{ marginBottom: '12px' }}>
                <div style={{
                    fontSize: '14px',
                    color: 'var(--neon-cyan)',
                    marginBottom: '2px'
                }}>
                    {greeting},
                </div>
                <div style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: 'var(--text-primary)'
                }}>
                    {fullName}
                </div>
            </div>

            {/* Droits Status */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                background: `${droitsInfo.color}15`,
                borderRadius: '8px',
                border: `1px solid ${droitsInfo.color}30`
            }}>
                <StatusDot status={droitsInfo.status} size={10} />
                <span style={{
                    fontSize: '13px',
                    color: droitsInfo.color,
                    fontWeight: 500
                }}>
                    {droitsInfo.label}
                </span>
            </div>

            {/* Expiration Date if applicable */}
            {patient.droitsAMO?.dateExpiration && (
                <div style={{
                    marginTop: '8px',
                    fontSize: '11px',
                    color: 'var(--text-secondary)'
                }}>
                    Exp: {patient.droitsAMO.dateExpiration}
                </div>
            )}
        </div>
    );
};

export default PatientToast;
