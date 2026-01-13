import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ToolCard } from '../components/ui/ToolCard';
import { GlassCard } from '../components/ui/GlassCard';
import { StatusDot } from '../components/ui/StatusDot';
import { motion } from 'framer-motion';

export function Pharmacy() {
    const navigate = useNavigate();
    return (
        <div className="p-8 h-full overflow-y-auto">
            <header className="mb-8 window-drag-region">
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                    <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                        Outils Officine
                    </span>
                    <span className="text-xs px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        V 2.0
                    </span>
                </h1>
                <p className="text-white/50">
                    Suite d'outils cliniques pour la Grande Pharmacie de Tassigny.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <ToolCard
                    title="Plan Personnalisé de Prévention"
                    description="Générer un bilan personnalisé complet pour le patient."
                    icon="📋"
                    colorVar="var(--mint)"
                    status="beta"
                    onClick={() => navigate('/ppp')}
                />
                <ToolCard
                    title="TROD Angine"
                    description="Dépistage angines à streptocoque A. Protocole complet."
                    icon="🌡️"
                    colorVar="var(--cyan)"
                    status="soon"
                />
                <ToolCard
                    title="Prescription Vaccinale"
                    description="Éligibilité et bon de vaccination."
                    icon="💉"
                    colorVar="var(--iris)"
                    status="soon"
                />
                <ToolCard
                    title="Ordonnance Sécurisée"
                    description="Analyse des interactions et contre-indications."
                    icon="🛡️"
                    colorVar="var(--amber)"
                    status="soon"
                />
                <ToolCard
                    title="Calcul de Caisse"
                    description="Comptabilité de fin de journée et écarts."
                    icon="🧮"
                    colorVar="var(--mint)"
                    status="ready"
                    onClick={() => navigate('/caisse')}
                />
                <ToolCard
                    title="Calcul de Doses"
                    description="Vérification pédiatrique et conseils galéniques."
                    icon="💊"
                    colorVar="var(--cyan)"
                    status="ready"
                    onClick={() => navigate('/dosage')}
                />
            </div>

            {/* Context Widget */}

        </div>
    );
}
