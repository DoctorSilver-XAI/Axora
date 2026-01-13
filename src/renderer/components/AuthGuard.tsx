/**
 * Auth Guard Component
 * 
 * Protects routes by requiring authentication.
 * Shows a loading spinner while checking auth state,
 * redirects to login page if not authenticated.
 */

import { ReactNode } from 'react';
import { useAuth } from '../services/AuthContext';
import { LoginPage } from '../pages/LoginPage';
import { motion } from 'framer-motion';
import { AxoraLogo } from './AxoraLogo';

interface AuthGuardProps {
    children: ReactNode;
    /**
     * If true, shows the children even if Supabase is not configured.
     * Useful for development/demo mode.
     */
    allowUnconfigured?: boolean;
}

export function AuthGuard({ children, allowUnconfigured = false }: AuthGuardProps) {
    const { user, loading, isConfigured } = useAuth();

    // -------------------------------------------------------------------------
    // LOADING STATE
    // -------------------------------------------------------------------------

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f1115] flex items-center justify-center">
                {/* Background gradient */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/10 via-transparent to-transparent" />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative text-center"
                >
                    {/* Animated Logo */}
                    <motion.div
                        animate={{
                            scale: [1, 1.05, 1],
                            opacity: [0.7, 1, 0.7],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    >
                        <AxoraLogo size={64} className="mx-auto mb-6" />
                    </motion.div>

                    {/* Spinner */}
                    <div className="relative w-12 h-12 mx-auto mb-4">
                        <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full" />
                        <div className="absolute inset-0 border-4 border-transparent border-t-indigo-500 rounded-full animate-spin" />
                    </div>

                    {/* Text */}
                    <p className="text-gray-500 text-sm">Chargement...</p>
                </motion.div>
            </div>
        );
    }

    // -------------------------------------------------------------------------
    // UNCONFIGURED STATE (Development/Demo)
    // -------------------------------------------------------------------------

    if (!isConfigured && allowUnconfigured) {
        // Allow access in development mode without Supabase
        return <>{children}</>;
    }

    // -------------------------------------------------------------------------
    // UNAUTHENTICATED STATE
    // -------------------------------------------------------------------------

    if (!user) {
        return <LoginPage />;
    }

    // -------------------------------------------------------------------------
    // AUTHENTICATED - RENDER CHILDREN
    // -------------------------------------------------------------------------

    return <>{children}</>;
}
