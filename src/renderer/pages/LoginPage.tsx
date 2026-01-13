/**
 * Login Page
 * 
 * Beautiful authentication page with support for:
 * - Email/Password login
 * - Account registration
 * - Magic Link (passwordless) login
 */

import { useState } from 'react';
import { useAuth } from '../services/AuthContext';
import { Mail, Lock, Sparkles, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AxoraLogo } from '../components/AxoraLogo';

type AuthMode = 'login' | 'register' | 'magic';

interface FormMessage {
    type: 'success' | 'error';
    text: string;
}

export function LoginPage() {
    const { signInWithEmail, signInWithMagicLink, signUp, isConfigured } = useAuth();

    // Form state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [mode, setMode] = useState<AuthMode>('login');
    const [message, setMessage] = useState<FormMessage | null>(null);

    // -------------------------------------------------------------------------
    // HANDLERS
    // -------------------------------------------------------------------------

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email.trim()) {
            setMessage({ type: 'error', text: 'Veuillez entrer votre email.' });
            return;
        }

        if (mode !== 'magic' && !password.trim()) {
            setMessage({ type: 'error', text: 'Veuillez entrer votre mot de passe.' });
            return;
        }

        setIsLoading(true);
        setMessage(null);

        try {
            let result: { error: any };

            switch (mode) {
                case 'magic':
                    result = await signInWithMagicLink(email);
                    if (!result.error) {
                        setMessage({
                            type: 'success',
                            text: '✨ Lien magique envoyé ! Vérifiez votre boîte mail.'
                        });
                    }
                    break;

                case 'register':
                    result = await signUp(email, password);
                    if (!result.error) {
                        setMessage({
                            type: 'success',
                            text: '🎉 Compte créé ! Vérifiez votre email pour confirmer votre inscription.'
                        });
                    }
                    break;

                default: // login
                    result = await signInWithEmail(email, password);
                    // If successful, the AuthContext will update and redirect automatically
                    break;
            }

            if (result.error) {
                // Translate common error messages to French
                const errorMessage = translateError(result.error.message);
                setMessage({ type: 'error', text: errorMessage });
            }
        } catch (error: any) {
            setMessage({
                type: 'error',
                text: error.message || 'Une erreur inattendue est survenue.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const translateError = (message: string): string => {
        const translations: Record<string, string> = {
            'Invalid login credentials': 'Email ou mot de passe incorrect.',
            'Email not confirmed': 'Veuillez confirmer votre email avant de vous connecter.',
            'User already registered': 'Un compte existe déjà avec cet email.',
            'Password should be at least 6 characters': 'Le mot de passe doit contenir au moins 6 caractères.',
            'Invalid email': 'Adresse email invalide.',
            'Signup disabled': 'Les inscriptions sont temporairement désactivées.',
        };
        return translations[message] || message;
    };

    // -------------------------------------------------------------------------
    // RENDER - Configuration Warning
    // -------------------------------------------------------------------------

    if (!isConfigured) {
        return (
            <div className="min-h-screen bg-[#0f1115] flex items-center justify-center p-6">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent" />

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative w-full max-w-md text-center"
                >
                    <AxoraLogo size={64} className="mx-auto mb-6" />

                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6">
                        <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-amber-300 mb-2">
                            Configuration requise
                        </h2>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Supabase n'est pas encore configuré. Veuillez ajouter vos clés API dans le fichier <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">.env</code>
                        </p>
                        <div className="mt-4 text-left bg-black/20 rounded-lg p-3 font-mono text-xs text-gray-500">
                            SUPABASE_URL=https://...supabase.co<br />
                            SUPABASE_ANON_KEY=eyJ...
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    // -------------------------------------------------------------------------
    // RENDER - Main Login Form
    // -------------------------------------------------------------------------

    return (
        <div className="min-h-screen bg-[#0f1115] flex items-center justify-center p-6 overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent" />
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative w-full max-w-md z-10"
            >
                {/* Logo & Title */}
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                    >
                        <AxoraLogo size={72} className="mx-auto mb-4" />
                    </motion.div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
                        Bienvenue sur Axora
                    </h1>
                    <p className="text-gray-500 mt-2 text-sm">
                        Votre assistant pharmaceutique intelligent
                    </p>
                </div>

                {/* Form Card */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-[#1a1c2e]/90 border border-[#2d323b] rounded-2xl p-8 backdrop-blur-xl shadow-2xl shadow-black/20"
                >
                    {/* Mode Tabs */}
                    <div className="flex gap-1 mb-6 p-1 bg-white/5 rounded-xl">
                        {(['login', 'register', 'magic'] as const).map((m) => (
                            <button
                                key={m}
                                onClick={() => {
                                    setMode(m);
                                    setMessage(null);
                                }}
                                className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${mode === m
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {m === 'login' ? 'Connexion' : m === 'register' ? 'Inscription' : 'Magic Link'}
                            </button>
                        ))}
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email Input */}
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email"
                                autoComplete="email"
                                className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-indigo-500/50 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            />
                        </div>

                        {/* Password Input (hidden for magic link) */}
                        <AnimatePresence mode="wait">
                            {mode !== 'magic' && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="relative group overflow-hidden"
                                >
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-indigo-400 transition-colors z-10" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Mot de passe"
                                        autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                                        className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-indigo-500/50 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Message Display */}
                        <AnimatePresence mode="wait">
                            {message && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className={`flex items-start gap-3 p-4 rounded-xl text-sm ${message.type === 'success'
                                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                            : 'bg-red-500/10 text-red-300 border border-red-500/20'
                                        }`}
                                >
                                    {message.type === 'success'
                                        ? <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                        : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                    }
                                    <span>{message.text}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:from-indigo-600/50 disabled:to-indigo-500/50 rounded-xl text-white font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 active:scale-[0.98]"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    {mode === 'magic'
                                        ? <Sparkles className="w-5 h-5" />
                                        : <ArrowRight className="w-5 h-5" />
                                    }
                                    {mode === 'login'
                                        ? 'Se connecter'
                                        : mode === 'register'
                                            ? 'Créer mon compte'
                                            : 'Envoyer le lien magique'
                                    }
                                </>
                            )}
                        </button>
                    </form>

                    {/* Magic Link Info */}
                    {mode === 'magic' && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center text-xs text-gray-500 mt-4"
                        >
                            Un lien de connexion sécurisé sera envoyé à votre adresse email.
                        </motion.p>
                    )}
                </motion.div>

                {/* Footer */}
                <p className="text-center text-xs text-gray-600 mt-6">
                    Axora • PhiGenix 6.0 • Assistant Pharmaceutique IA
                </p>
            </motion.div>
        </div>
    );
}
