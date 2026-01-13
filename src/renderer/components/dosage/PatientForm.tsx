import React from 'react';

interface PatientParams {
    weight: number;
    age?: number; // in years
    clCr?: number; // Creatinine clearance
}

interface PatientFormProps {
    params: PatientParams;
    onChange: (params: PatientParams) => void;
}

export function PatientForm({ params, onChange }: PatientFormProps) {

    const handleChange = (field: keyof PatientParams, value: string) => {
        const numValue = parseFloat(value);
        onChange({
            ...params,
            [field]: isNaN(numValue) ? undefined : numValue
        });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Weight Input (Primary) */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <label className="block text-sm font-medium text-white/70 mb-2">
                    Poids (kg) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                    <input
                        type="number"
                        value={params.weight || ''}
                        onChange={(e) => handleChange('weight', e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xl font-mono text-white focus:outline-none focus:border-emerald-500/50"
                        placeholder="ex: 16"
                    />
                    <span className="absolute right-3 top-3 text-white/30 text-sm">kg</span>
                </div>
            </div>

            {/* Age Input (Optional but useful for checks) */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <label className="block text-sm font-medium text-white/70 mb-2">
                    Âge (ans)
                </label>
                <div className="relative">
                    <input
                        type="number"
                        value={params.age || ''}
                        onChange={(e) => handleChange('age', e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xl font-mono text-white focus:outline-none focus:border-blue-500/50"
                        placeholder="ex: 4"
                    />
                    <span className="absolute right-3 top-3 text-white/30 text-sm">ans</span>
                </div>
            </div>

            {/* Renal Function (Advanced) */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-1">
                    <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded border border-red-500/30">
                        Avancé
                    </span>
                </div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                    Clairance Créat.
                </label>
                <div className="relative">
                    <input
                        type="number"
                        value={params.clCr || ''}
                        onChange={(e) => handleChange('clCr', e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xl font-mono text-white focus:outline-none focus:border-red-500/50"
                        placeholder="Normal"
                    />
                    <span className="absolute right-3 top-3 text-white/30 text-sm">ml/min</span>
                </div>
                <p className="text-[10px] text-white/30 mt-2">
                    Laisser vide si fonction rénale normale.
                </p>
            </div>
        </div>
    );
}
