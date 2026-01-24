import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  User,
  Mail,
  Building2,
  MapPin,
  Lock,
  Camera,
  Save,
  Check,
} from 'lucide-react'
import { cn } from '@shared/utils/cn'
import { useAuth } from '@shared/contexts/AuthContext'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

export function Profile() {
  const { user } = useAuth()
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Form state
  const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name || '')
  const [pharmacyName, setPharmacyName] = useState('')
  const [address, setAddress] = useState('')
  const [region, setRegion] = useState('')

  const handleSave = async () => {
    setIsSaving(true)
    // TODO: Sauvegarder dans Supabase user_metadata
    await new Promise((resolve) => setTimeout(resolve, 800))
    setIsSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const getInitials = () => {
    if (displayName) {
      return displayName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return user?.email?.[0]?.toUpperCase() || 'P'
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-2xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="mb-8">
        <h1 className="text-2xl font-semibold text-white flex items-center gap-3">
          <User className="w-7 h-7 text-axora-400" />
          Profil
        </h1>
        <p className="text-white/60 mt-1">
          Gérez vos informations personnelles et professionnelles
        </p>
      </motion.div>

      {/* Avatar Section */}
      <motion.div variants={itemVariants} className="glass rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-axora-400 to-axora-600 flex items-center justify-center">
              <span className="text-3xl font-semibold text-white">{getInitials()}</span>
            </div>
            <button className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-surface-100 border border-white/10 flex items-center justify-center hover:bg-surface-50 transition-colors">
              <Camera className="w-4 h-4 text-white/60" />
            </button>
          </div>
          <div>
            <h2 className="text-lg font-medium text-white">
              {displayName || 'Pharmacien'}
            </h2>
            <p className="text-sm text-white/50">{user?.email || 'Non connecté'}</p>
            <p className="text-xs text-white/30 mt-1">
              Membre depuis {user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : 'N/A'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Personal Info */}
      <motion.div variants={itemVariants} className="glass rounded-2xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">
          Informations personnelles
        </h3>

        <div className="space-y-4">
          <InputField
            label="Nom d'affichage"
            icon={User}
            value={displayName}
            onChange={setDisplayName}
            placeholder="Dr. Jean Dupont"
          />

          <InputField
            label="Email"
            icon={Mail}
            value={user?.email || ''}
            onChange={() => {}}
            placeholder="email@example.com"
            disabled
            hint="L'email ne peut pas être modifié"
          />
        </div>
      </motion.div>

      {/* Professional Info */}
      <motion.div variants={itemVariants} className="glass rounded-2xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">
          Informations professionnelles
        </h3>

        <div className="space-y-4">
          <InputField
            label="Nom de la pharmacie"
            icon={Building2}
            value={pharmacyName}
            onChange={setPharmacyName}
            placeholder="Pharmacie du Centre"
          />

          <InputField
            label="Adresse"
            icon={MapPin}
            value={address}
            onChange={setAddress}
            placeholder="123 Rue de la Santé, 75000 Paris"
          />

          <SelectField
            label="Région"
            icon={MapPin}
            value={region}
            onChange={setRegion}
            options={[
              { value: '', label: 'Sélectionner une région' },
              { value: 'idf', label: 'Île-de-France' },
              { value: 'aura', label: 'Auvergne-Rhône-Alpes' },
              { value: 'paca', label: "Provence-Alpes-Côte d'Azur" },
              { value: 'occ', label: 'Occitanie' },
              { value: 'naq', label: 'Nouvelle-Aquitaine' },
              { value: 'hdf', label: 'Hauts-de-France' },
              { value: 'bre', label: 'Bretagne' },
              { value: 'nor', label: 'Normandie' },
              { value: 'gest', label: 'Grand Est' },
              { value: 'pdl', label: 'Pays de la Loire' },
              { value: 'cvl', label: 'Centre-Val de Loire' },
              { value: 'bfc', label: 'Bourgogne-Franche-Comté' },
              { value: 'cor', label: 'Corse' },
            ]}
          />
        </div>
      </motion.div>

      {/* Security */}
      <motion.div variants={itemVariants} className="glass rounded-2xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">
          Sécurité
        </h3>

        <button className="flex items-center gap-3 w-full p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left group">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Changer le mot de passe</p>
            <p className="text-xs text-white/50">Mettre à jour votre mot de passe de connexion</p>
          </div>
          <span className="text-white/30 group-hover:text-white/60 transition-colors">→</span>
        </button>
      </motion.div>

      {/* Save Button */}
      <motion.div variants={itemVariants} className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={cn(
            'flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all',
            saved
              ? 'bg-emerald-500 text-white'
              : 'bg-axora-500 hover:bg-axora-600 text-white'
          )}
        >
          {saved ? (
            <>
              <Check className="w-5 h-5" />
              Enregistré
            </>
          ) : isSaving ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Save className="w-5 h-5" />
              </motion.div>
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Enregistrer
            </>
          )}
        </button>
      </motion.div>
    </motion.div>
  )
}

// Composants réutilisables

interface InputFieldProps {
  label: string
  icon: React.ComponentType<{ className?: string }>
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  hint?: string
}

function InputField({ label, icon: Icon, value, onChange, placeholder, disabled, hint }: InputFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-white/70 mb-2">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10',
            'text-white text-sm placeholder-white/30',
            'focus:border-axora-500/50 focus:outline-none transition-colors',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        />
      </div>
      {hint && <p className="text-xs text-white/40 mt-1.5">{hint}</p>}
    </div>
  )
}

interface SelectFieldProps {
  label: string
  icon: React.ComponentType<{ className?: string }>
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}

function SelectField({ label, icon: Icon, value, onChange, options }: SelectFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-white/70 mb-2">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10',
            'text-white text-sm appearance-none',
            'focus:border-axora-500/50 focus:outline-none transition-colors',
            !value && 'text-white/30'
          )}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-surface-100">
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
