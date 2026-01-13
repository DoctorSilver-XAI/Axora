import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, Euro, Banknote, Coins, AlertCircle, RotateCcw, Printer, Check, Calendar, TrendingUp, TrendingDown, ArrowLeft } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';

interface FondsCaisses {
    caisse1: number | string;
    caisse2: number | string;
    caisse3: number | string;
    caisse4: number | string;
}

interface BilletsRetires {
    b10: number | string;
    b20: number | string;
    b50: number | string;
    b100: number | string;
    b200: number | string;
    b500: number | string;
}

export function CashRegister() {
    const navigate = useNavigate();

    // --- STATE ---
    const [fondsCaisses, setFondsCaisses] = useState<FondsCaisses>({
        caisse1: 100, caisse2: 115, caisse3: 115, caisse4: 135,
    });
    const [totalPieces, setTotalPieces] = useState<number | string>(194.15);
    const [billetsRetires, setBilletsRetires] = useState<BilletsRetires>({
        b10: 12, b20: 11, b50: 10, b100: 1, b200: 0, b500: 0,
    });
    const [fondVeille, setFondVeille] = useState<number | string>(640.78);
    const [montantLGPI, setMontantLGPI] = useState<number | string>(957.15);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [currentDate, setCurrentDate] = useState('');

    useEffect(() => {
        setCurrentDate(new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    }, []);

    // --- CALCULS ---
    const totalFondEspeces = Object.values(fondsCaisses).reduce((acc, val) => acc + (parseFloat(String(val)) || 0), 0);
    const valTotalPieces = parseFloat(String(totalPieces)) || 0;
    const valeurBilletsRetires =
        ((Number(billetsRetires.b10) || 0) * 10) + ((Number(billetsRetires.b20) || 0) * 20) + ((Number(billetsRetires.b50) || 0) * 50) +
        ((Number(billetsRetires.b100) || 0) * 100) + ((Number(billetsRetires.b200) || 0) * 200) + ((Number(billetsRetires.b500) || 0) * 500);
    const sommeTotalePhysique = totalFondEspeces + valTotalPieces + valeurBilletsRetires;
    const especesGenerees = sommeTotalePhysique - (parseFloat(String(fondVeille)) || 0);
    const ecart = especesGenerees - (parseFloat(String(montantLGPI)) || 0);

    // --- UI HELPERS ---
    const getBilletColor = (val: number) => {
        switch (val) {
            case 10: return "border-l-4 border-l-red-500 bg-red-500/10";
            case 20: return "border-l-4 border-l-blue-500 bg-blue-500/10";
            case 50: return "border-l-4 border-l-orange-500 bg-orange-500/10";
            case 100: return "border-l-4 border-l-green-500 bg-green-500/10";
            case 200: return "border-l-4 border-l-yellow-500 bg-yellow-500/10";
            case 500: return "border-l-4 border-l-purple-500 bg-purple-500/10";
            default: return "border-white/10";
        }
    };

    const formatCurrency = (amount: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

    // --- HANDLERS ---
    const handleCaisseChange = (key: keyof FondsCaisses, value: string) => {
        setFondsCaisses(prev => ({ ...prev, [key]: value === '' ? '' : parseFloat(value) }));
    };

    const handleBilletRetireChange = (key: keyof BilletsRetires, value: string) => {
        setBilletsRetires(prev => ({ ...prev, [key]: value === '' ? '' : parseInt(value) }));
    };

    const handleResetClick = () => {
        if (showResetConfirm) {
            setFondsCaisses({ caisse1: 0, caisse2: 0, caisse3: 0, caisse4: 0 });
            setTotalPieces(0);
            setBilletsRetires({ b10: 0, b20: 0, b50: 0, b100: 0, b200: 0, b500: 0 });
            setMontantLGPI(0);
            setFondVeille(0);
            setShowResetConfirm(false);
        } else {
            setShowResetConfirm(true);
            setTimeout(() => setShowResetConfirm(false), 3000);
        }
    };

    return (
        <div className="h-full overflow-y-auto p-8">
            {/* Header */}
            <header className="mb-8 flex items-center justify-between print:hidden">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                                Calcul de Caisse
                            </span>
                        </h1>
                        <div className="flex items-center gap-2 text-white/50 text-sm capitalize">
                            <Calendar size={14} />
                            {currentDate}
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:bg-white/10 transition-all font-medium text-sm">
                        <Printer size={16} /> Imprimer
                    </button>
                    <button
                        onClick={handleResetClick}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium text-sm ${showResetConfirm
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-red-500/20 hover:text-red-400'
                            }`}
                    >
                        {showResetConfirm ? <><Check size={16} /> Confirmer</> : <><RotateCcw size={16} /> Réinitialiser</>}
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LEFT COLUMN: Inputs */}
                <div className="lg:col-span-7 space-y-6">

                    {/* STEP 1: FONDS */}
                    <GlassCard className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-400">
                                    <Banknote size={20} />
                                </div>
                                <h2 className="font-bold text-white">1. Fonds de Caisse</h2>
                            </div>
                            <span className="text-xs font-semibold bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full">
                                Total: {formatCurrency(totalFondEspeces + valTotalPieces)}
                            </span>
                        </div>

                        <div className="mb-6">
                            <label className="text-xs font-bold uppercase text-white/40 tracking-wider mb-3 block">Billets Tiroirs (Espèces)</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {([1, 2, 3, 4] as const).map((num) => (
                                    <div key={`caisse${num}`} className="space-y-1.5">
                                        <label className="text-sm font-medium text-white/60 ml-1">Caisse {num}</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={fondsCaisses[`caisse${num}` as keyof FondsCaisses]}
                                                onChange={(e) => handleCaisseChange(`caisse${num}` as keyof FondsCaisses, e.target.value)}
                                                className="w-full text-right p-3 pl-8 bg-white/5 border border-white/10 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none font-mono font-medium text-white transition-all"
                                            />
                                            <span className="absolute left-3 top-3.5 text-white/40 text-sm">€</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-6 border-t border-white/10">
                            <label className="text-xs font-bold uppercase text-white/40 tracking-wider mb-3 block">Monnaie (Pièces)</label>
                            <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20 flex items-center gap-4">
                                <div className="p-3 bg-emerald-500/20 rounded-full text-emerald-400">
                                    <Coins size={24} />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-white/70 mb-1">Montant total pièces</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={totalPieces}
                                            onChange={(e) => setTotalPieces(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                            className="w-full max-w-[200px] bg-white/10 text-right p-2 pl-6 border border-emerald-500/30 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold text-emerald-400 font-mono"
                                        />
                                        <span className="absolute left-3 top-2.5 text-emerald-400/50 text-sm">€</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                    {/* STEP 2: RETRAITS */}
                    <GlassCard className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400">
                                    <Euro size={20} />
                                </div>
                                <h2 className="font-bold text-white">2. Espèces Retirées (Banque)</h2>
                            </div>
                            <span className="text-xs font-semibold bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full">
                                Total: {formatCurrency(valeurBilletsRetires)}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {([10, 20, 50, 100, 200, 500] as const).map((val) => (
                                <div key={`billet${val}`} className={`relative p-3 rounded-xl border border-white/10 transition-all hover:border-white/20 ${getBilletColor(val)}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-bold text-white/50 uppercase">Billet</span>
                                        <span className="text-xs font-bold text-white/60 bg-white/10 px-1.5 py-0.5 rounded">{val}€</span>
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <div className="flex-1">
                                            <input
                                                type="number"
                                                value={billetsRetires[`b${val}` as keyof BilletsRetires]}
                                                onChange={(e) => handleBilletRetireChange(`b${val}` as keyof BilletsRetires, e.target.value)}
                                                className="w-full text-center p-2 bg-white/5 border border-white/10 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none font-mono text-lg font-semibold text-white"
                                                placeholder="0"
                                            />
                                        </div>
                                        <span className="text-xs text-white/40 mb-2 font-medium">Qté</span>
                                    </div>
                                    <div className="mt-2 text-right text-xs font-semibold text-white/50">
                                        = {formatCurrency((Number(billetsRetires[`b${val}` as keyof BilletsRetires]) || 0) * val)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlassCard>

                    {/* STEP 3: REFERENCES */}
                    <GlassCard className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-amber-500/20 p-2 rounded-lg text-amber-400">
                                <Calculator size={20} />
                            </div>
                            <h2 className="font-bold text-white">3. Comparaison</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="text-sm font-medium text-white/60 mb-2 block">Fond de caisse veille (Papier)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={fondVeille}
                                        onChange={(e) => setFondVeille(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                        className="w-full text-right p-3 pl-10 bg-amber-500/10 border border-amber-500/20 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none font-mono text-lg text-amber-400"
                                    />
                                    <div className="absolute left-3 top-3.5 text-amber-400/50">
                                        <Banknote size={18} />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-white/60 mb-2 block">Montant Théorique (LGPI)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={montantLGPI}
                                        onChange={(e) => setMontantLGPI(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                        className="w-full text-right p-3 pl-10 bg-amber-500/10 border border-amber-500/20 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none font-mono text-lg text-amber-400"
                                    />
                                    <div className="absolute left-3 top-3.5 text-amber-400/50">
                                        <Calculator size={18} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* RIGHT COLUMN: Results */}
                <div className="lg:col-span-5">
                    <div className="sticky top-8 space-y-4">
                        {/* Main Result Card */}
                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-xl overflow-hidden relative border border-white/10">
                            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl"></div>

                            <div className="p-8 relative z-10">
                                <h3 className="text-white/50 text-xs font-bold uppercase tracking-widest mb-2">Espèces générées (Réel)</h3>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-bold tracking-tight font-mono text-white">{formatCurrency(especesGenerees).replace('€', '')}</span>
                                    <span className="text-2xl text-white/40">€</span>
                                </div>

                                <div className="mt-8 space-y-4">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-white/50">Objectif LGPI</span>
                                        <span className="font-mono text-white/80">{formatCurrency(parseFloat(String(montantLGPI)) || 0)}</span>
                                    </div>

                                    {/* Status Indicator */}
                                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-sm font-medium text-white/70">Écart Final</span>
                                            <span className={`text-xl font-bold font-mono ${ecart > 0 ? 'text-blue-400' : ecart < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                {ecart > 0 ? '+' : ''}{ecart.toFixed(2)} €
                                            </span>
                                        </div>

                                        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-500 ${Math.abs(ecart) < 0.05 ? 'bg-emerald-500 w-full' : ecart > 0 ? 'bg-blue-500 w-full' : 'bg-red-500 w-full'
                                                    }`}
                                            ></div>
                                        </div>

                                        <div className="mt-3 flex items-start gap-2 text-xs leading-relaxed">
                                            {Math.abs(ecart) < 0.05 ? (
                                                <span className="text-emerald-400 flex items-center gap-1.5"><Check size={14} /> Parfait. La caisse est juste.</span>
                                            ) : ecart > 0 ? (
                                                <span className="text-blue-400 flex items-center gap-1.5"><TrendingUp size={14} /> Excédent. Vérifiez les rendus monnaie.</span>
                                            ) : (
                                                <span className="text-red-400 flex items-center gap-1.5"><TrendingDown size={14} /> Manquant. Vérifiez les saisies.</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Receipt Style Details */}
                        <GlassCard className="p-6">
                            <div className="text-center mb-6 pb-4 border-b border-dashed border-white/20">
                                <h4 className="font-bold text-white uppercase tracking-widest text-sm">Récapitulatif</h4>
                                <p className="text-xs text-white/40 mt-1 capitalize">{currentDate}</p>
                            </div>

                            <div className="space-y-3 text-sm font-mono">
                                <div className="flex justify-between text-white/60">
                                    <span>Fonds Espèces</span>
                                    <span className="font-bold text-white">{formatCurrency(totalFondEspeces)}</span>
                                </div>
                                <div className="flex justify-between text-white/60">
                                    <span>Fonds Pièces</span>
                                    <span className="font-bold text-white">{formatCurrency(valTotalPieces)}</span>
                                </div>
                                <div className="flex justify-between text-white/60">
                                    <span>Retraits (Banque)</span>
                                    <span className="font-bold text-white">{formatCurrency(valeurBilletsRetires)}</span>
                                </div>

                                <div className="border-t border-white/10 my-2"></div>

                                <div className="flex justify-between font-bold text-white">
                                    <span>TOTAL PHYSIQUE</span>
                                    <span>{formatCurrency(sommeTotalePhysique)}</span>
                                </div>

                                <div className="flex justify-between text-white/40 italic">
                                    <span>- Fond Veille</span>
                                    <span>-{formatCurrency(parseFloat(String(fondVeille)) || 0)}</span>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-white/10 flex justify-center">
                                <div className="text-center">
                                    <p className="text-xs text-white/40 uppercase">Signature Pharmacien</p>
                                    <div className="h-12 w-32 border-b border-white/20 mt-2 mx-auto"></div>
                                </div>
                            </div>
                        </GlassCard>
                    </div>
                </div>
            </div>
        </div>
    );
}
