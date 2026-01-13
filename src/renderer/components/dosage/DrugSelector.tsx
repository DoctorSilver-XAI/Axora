import React, { useState, useMemo } from 'react';
import { DRUGS, Drug } from '../../data/pharmacology';
import { motion } from 'framer-motion';

interface DrugSelectorProps {
    selectedDrug?: Drug;
    onSelect: (drug: Drug) => void;
}

export function DrugSelector({ selectedDrug, onSelect }: DrugSelectorProps) {
    const [search, setSearch] = useState('');

    const filteredDrugs = useMemo(() => {
        return DRUGS.filter(d =>
            d.name.toLowerCase().includes(search.toLowerCase()) ||
            d.brandNames.some(b => b.toLowerCase().includes(search.toLowerCase()))
        );
    }, [search]);

    return (
        <div className="space-y-4">
            <div className="relative">
                <input
                    type="text"
                    placeholder="Rechercher une molécule ou un nom de marque..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                <span className="absolute left-3 top-3.5 text-white/30">🔍</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredDrugs.map((drug) => (
                    <motion.button
                        key={drug.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onSelect(drug)}
                        className={`text-left p-4 rounded-xl border transition-all ${selectedDrug?.id === drug.id
                                ? 'bg-emerald-500/20 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                    >
                        <h3 className={`font-semibold text-lg ${selectedDrug?.id === drug.id ? 'text-emerald-400' : 'text-white'
                            }`}>
                            {drug.name}
                        </h3>
                        <p className="text-sm text-white/50 mb-2">
                            {drug.brandNames.join(', ')}
                        </p>
                        <div className="flex gap-2 mt-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${drug.type === 'antibiotic' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                    drug.type === 'corticoid' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                        'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                }`}>
                                {drug.type.toUpperCase()}
                            </span>
                        </div>
                    </motion.button>
                ))}
            </div>
        </div>
    );
}
