import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { DrugSelector } from '../components/dosage/DrugSelector';
import { PatientForm, PatientParams } from '../components/dosage/PatientForm';
import { ResultCard } from '../components/dosage/ResultCard';
import { DRUGS, Drug, DrugForm, Indication } from '../data/pharmacology';
import { PosoEngine, CalculationResult } from '../services/PosoEngine';
import ReactMarkdown from 'react-markdown'; // Ensure this is installed, otherwise standard div

export function DosageCalculator() {
    const navigate = useNavigate();

    // State
    const [selectedDrug, setSelectedDrug] = useState<Drug | undefined>();
    const [patientParams, setPatientParams] = useState<PatientParams>({ weight: 0, age: undefined, clCr: undefined });
    const [selectedIndication, setSelectedIndication] = useState<Indication | undefined>();
    const [selectedForm, setSelectedForm] = useState<DrugForm | undefined>();
    const [durationDays, setDurationDays] = useState(6);

    const [result, setResult] = useState<CalculationResult | undefined>();

    // Reset dependent fields when drug changes
    useEffect(() => {
        if (selectedDrug) {
            setSelectedIndication(selectedDrug.indications[0]);
            setSelectedForm(selectedDrug.forms[0]);
        }
    }, [selectedDrug]);

    // Update validation when indication changes (set duration default)
    useEffect(() => {
        if (selectedIndication) {
            setDurationDays(selectedIndication.durationDays);
        }
    }, [selectedIndication]);

    // Calculate whenever inputs change
    useEffect(() => {
        if (selectedDrug && selectedIndication && selectedForm && patientParams.weight > 0) {
            const res = PosoEngine.calculate(
                patientParams.weight,
                selectedDrug,
                selectedIndication,
                selectedForm,
                durationDays,
                patientParams.clCr,
                patientParams.age
            );
            setResult(res);
        } else {
            setResult(undefined);
        }
    }, [selectedDrug, selectedIndication, selectedForm, patientParams, durationDays]);


    return (
        <div className="h-full flex flex-col bg-[#0F1115] text-white">
            {/* Header */}
            <header className="p-6 border-b border-white/5 flex items-center justify-between bg-[#13161B]">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors"
                    >
                        ← Retour
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                            PosoCalc
                        </h1>
                        <p className="text-white/40 text-xs">Calculateur de Doses Pédiatriques</p>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-white/5">

                {/* Left Column: Inputs */}
                <div className="w-full md:w-1/2 lg:w-8/12 p-6 overflow-y-auto custom-scrollbar space-y-8">

                    {/* 1. Patient */}
                    <section>
                        <h2 className="text-sm uppercase tracking-widest text-white/40 font-semibold mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 rounded bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs border border-blue-500/20">1</span>
                            Patient
                        </h2>
                        <PatientForm params={patientParams} onChange={setPatientParams} />
                    </section>

                    {/* 2. Drug Selection */}
                    <section>
                        <h2 className="text-sm uppercase tracking-widest text-white/40 font-semibold mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 rounded bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs border border-emerald-500/20">2</span>
                            Médicament
                        </h2>
                        <DrugSelector selectedDrug={selectedDrug} onSelect={setSelectedDrug} />
                    </section>

                    {/* 3. Clinical Context (Only if drug selected) */}
                    {selectedDrug && (
                        <motion.section
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <h2 className="text-sm uppercase tracking-widest text-white/40 font-semibold mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded bg-purple-500/10 text-purple-400 flex items-center justify-center text-xs border border-purple-500/20">3</span>
                                Contexte Clinique
                            </h2>

                            <div className="space-y-4 bg-white/5 rounded-2xl p-4 border border-white/10">
                                {/* Indication */}
                                <div>
                                    <label className="block text-xs text-white/50 mb-2">Indication</label>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedDrug.indications.map(ind => (
                                            <button
                                                key={ind.id}
                                                onClick={() => setSelectedIndication(ind)}
                                                className={`px-3 py-2 rounded-lg text-sm border transition-all ${selectedIndication?.id === ind.id
                                                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                                                    : 'bg-black/20 text-white/70 border-white/10 hover:bg-white/10'
                                                    }`}
                                            >
                                                {ind.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Form */}
                                <div>
                                    <label className="block text-xs text-white/50 mb-2">Forme Galénique</label>
                                    <select
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-purple-500/50"
                                        value={selectedForm?.id}
                                        onChange={(e) => setSelectedForm(selectedDrug.forms.find(f => f.id === e.target.value))}
                                    >
                                        {selectedDrug.forms.map(form => (
                                            <option key={form.id} value={form.id}>
                                                {form.name} ({form.volume}ml)
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Duration */}
                                <div>
                                    <label className="block text-xs text-white/50 mb-2">Durée (jours)</label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="range"
                                            min="1" max="14"
                                            value={durationDays}
                                            onChange={(e) => setDurationDays(parseInt(e.target.value))}
                                            className="flex-1 accent-purple-500"
                                        />
                                        <span className="text-xl font-mono w-8 text-center">{durationDays}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.section>
                    )}
                </div>

                {/* Right Column: Results & Info */}
                <div className="w-full md:w-1/2 lg:w-4/12 bg-[#13161B] relative">
                    {result ? (
                        <div className="p-8 h-full overflow-y-auto">
                            <ResultCard result={result} />

                            {/* Extra Info / Monograph */}
                            {selectedDrug?.monograph && (
                                <div className="mt-8 p-6 rounded-xl bg-blue-500/5 border border-blue-500/10">
                                    <h3 className="text-blue-400 font-semibold mb-4 flex items-center gap-2">
                                        ℹ️ Informations Expert
                                    </h3>
                                    <div className="prose prose-invert prose-sm max-w-none text-white/70">
                                        {/* Use simple rendering if ReactMarkdown not avail, or just pre-wrap */}
                                        <pre className="whitespace-pre-wrap font-sans">{selectedDrug.monograph}</pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-white/20 p-8 text-center">
                            <div className="text-6xl mb-4 opacity-50">💊</div>
                            <p className="text-lg">Sélectionnez un patient et un médicament pour voir le calcul.</p>
                        </div>
                    )}
                </div>

            </main>
        </div>
    );
}
