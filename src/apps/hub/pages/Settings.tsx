import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  User,
  Key,
  Palette,
  Keyboard,
  Database,
  Bell,
  LogOut,
  ChevronRight,
  Bot,
  RotateCcw
} from 'lucide-react'
import { useAIPreference } from '@features/assistant/hooks/useAIPreference'
import {
  PROVIDER_LABELS,
  PROVIDER_DESCRIPTIONS,
  getModelTierLabel,
  MODEL_DESCRIPTIONS,
} from '@features/assistant/constants/providers'
import { cn } from '@shared/utils/cn'

type SettingsSection = 'account' | 'api' | 'ai' | 'appearance' | 'shortcuts' | 'data' | 'notifications'

const sections = [
  { id: 'account' as const, label: 'Compte', icon: User },
  { id: 'ai' as const, label: 'Assistant IA', icon: Bot },
  { id: 'api' as const, label: 'Clés API', icon: Key },
  { id: 'appearance' as const, label: 'Apparence', icon: Palette },
  { id: 'shortcuts' as const, label: 'Raccourcis', icon: Keyboard },
  { id: 'data' as const, label: 'Données', icon: Database },
  { id: 'notifications' as const, label: 'Notifications', icon: Bell },
]

export function Settings() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('account')

  return (
    <div className="flex gap-6 h-full -m-6">
      {/* Sidebar */}
      <div className="w-64 bg-surface-50 border-r border-white/5 p-4">
        <h1 className="text-lg font-semibold text-white px-3 mb-4">Paramètres</h1>

        <nav className="space-y-1">
          {sections.map((section) => {
            const Icon = section.icon
            const isActive = activeSection === section.id

            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl',
                  'text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-axora-500/20 text-axora-400'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                )}
              >
                <Icon className="w-5 h-5" />
                {section.label}
              </button>
            )
          })}
        </nav>

        {/* Logout button */}
        <div className="mt-8 pt-4 border-t border-white/5">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors">
            <LogOut className="w-5 h-5" />
            Déconnexion
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {activeSection === 'account' && <AccountSettings />}
        {activeSection === 'ai' && <AISettings />}
        {activeSection === 'api' && <APISettings />}
        {activeSection === 'appearance' && <AppearanceSettings />}
        {activeSection === 'shortcuts' && <ShortcutsSettings />}
        {activeSection === 'data' && <DataSettings />}
        {activeSection === 'notifications' && <NotificationsSettings />}
      </div>
    </div>
  )
}

function AccountSettings() {
  return (
    <div className="max-w-2xl space-y-6">
      <SectionHeader
        title="Compte"
        description="Gérez votre profil et vos informations personnelles"
      />

      <div className="glass rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-axora-500 flex items-center justify-center">
            <span className="text-2xl font-semibold text-white">P</span>
          </div>
          <div>
            <h3 className="font-medium text-white">Pharmacien</h3>
            <p className="text-sm text-white/50">Non connecté</p>
          </div>
          <button className="ml-auto px-4 py-2 rounded-xl bg-white/10 text-white text-sm hover:bg-white/15 transition-colors">
            Se connecter
          </button>
        </div>

        <div className="pt-4 border-t border-white/10">
          <p className="text-sm text-white/60">
            Connectez-vous pour synchroniser vos données et accéder à toutes les fonctionnalités.
          </p>
        </div>
      </div>
    </div>
  )
}

function APISettings() {
  return (
    <div className="max-w-2xl space-y-6">
      <SectionHeader
        title="Clés API"
        description="Configurez vos clés API pour les services IA"
      />

      <div className="glass rounded-2xl divide-y divide-white/5">
        <APIKeyInput label="Mistral AI" placeholder="Clé API Mistral" />
        <APIKeyInput label="OpenAI" placeholder="Clé API OpenAI" />
        <div className="p-4">
          <h4 className="text-sm font-medium text-white mb-2">IA Locale</h4>
          <input
            type="text"
            placeholder="http://localhost:11434"
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/40 focus:border-axora-500/50 focus:outline-none"
          />
          <p className="text-xs text-white/40 mt-1">Endpoint Ollama ou LM Studio</p>
        </div>
      </div>
    </div>
  )
}

function APIKeyInput({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <div className="p-4">
      <h4 className="text-sm font-medium text-white mb-2">{label}</h4>
      <input
        type="password"
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/40 focus:border-axora-500/50 focus:outline-none"
      />
    </div>
  )
}

function AppearanceSettings() {
  return (
    <div className="max-w-2xl space-y-6">
      <SectionHeader
        title="Apparence"
        description="Personnalisez l'apparence de l'application"
      />

      <div className="glass rounded-2xl p-6">
        <h4 className="text-sm font-medium text-white mb-4">Thème</h4>
        <div className="flex gap-3">
          <ThemeOption label="Sombre" isActive />
          <ThemeOption label="Clair" />
          <ThemeOption label="Système" />
        </div>
      </div>
    </div>
  )
}

function ThemeOption({ label, isActive = false }: { label: string; isActive?: boolean }) {
  return (
    <button
      className={cn(
        'px-4 py-2 rounded-xl text-sm font-medium transition-colors',
        isActive
          ? 'bg-axora-500 text-white'
          : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
      )}
    >
      {label}
    </button>
  )
}

function ShortcutsSettings() {
  return (
    <div className="max-w-2xl space-y-6">
      <SectionHeader
        title="Raccourcis clavier"
        description="Personnalisez les raccourcis clavier globaux"
      />

      <div className="glass rounded-2xl divide-y divide-white/5">
        <ShortcutRow label="Déclencher PhiVision" shortcut="⌘⇧P" />
        <ShortcutRow label="Ouvrir/Fermer Hub" shortcut="⌘⇧H" />
      </div>
    </div>
  )
}

function ShortcutRow({ label, shortcut }: { label: string; shortcut: string }) {
  return (
    <div className="flex items-center justify-between p-4">
      <span className="text-sm text-white">{label}</span>
      <span className="px-3 py-1 rounded-lg bg-white/10 text-sm font-mono text-white/80">
        {shortcut}
      </span>
    </div>
  )
}

function DataSettings() {
  return (
    <div className="max-w-2xl space-y-6">
      <SectionHeader
        title="Données"
        description="Gérez vos données et stockage"
      />

      <div className="glass rounded-2xl divide-y divide-white/5">
        <SettingsRow
          label="Stockage conversations"
          description="Choisir où stocker vos conversations"
          action={<ChevronRight className="w-5 h-5 text-white/40" />}
        />
        <SettingsRow
          label="Historique PhiVision"
          description="Gérer l'historique des captures"
          action={<span className="text-sm text-white/50">25 captures</span>}
        />
        <SettingsRow
          label="Exporter les données"
          description="Télécharger toutes vos données"
          action={<button className="text-sm text-axora-400">Exporter</button>}
        />
      </div>
    </div>
  )
}

function NotificationsSettings() {
  return (
    <div className="max-w-2xl space-y-6">
      <SectionHeader
        title="Notifications"
        description="Configurez les notifications de l'application"
      />

      <div className="glass rounded-2xl divide-y divide-white/5">
        <ToggleRow label="Notifications système" description="Recevoir des notifications" defaultChecked />
        <ToggleRow label="Sons" description="Jouer des sons de notification" />
      </div>
    </div>
  )
}

function ToggleRow({ label, description, defaultChecked = false }: { label: string; description: string; defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(defaultChecked)

  return (
    <div className="flex items-center justify-between p-4">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-white/50 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => setChecked(!checked)}
        className={cn(
          'w-11 h-6 rounded-full transition-colors',
          checked ? 'bg-axora-500' : 'bg-white/20'
        )}
      >
        <motion.div
          className="w-5 h-5 rounded-full bg-white shadow-sm"
          animate={{ x: checked ? 22 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  )
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="text-white/60 mt-1">{description}</p>
    </div>
  )
}

function SettingsRow({ label, description, action }: { label: string; description: string; action: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between p-4">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-white/50 mt-0.5">{description}</p>
      </div>
      {action}
    </div>
  )
}

function AISettings() {
  const {
    provider,
    model,
    setProvider,
    setModel,
    availableProviders,
    getModelsForProvider,
    systemPrompt,
    setSystemPrompt,
    resetSystemPrompt,
    isCustomPrompt
  } = useAIPreference()

  return (
    <div className="max-w-2xl space-y-6">
      <SectionHeader
        title="Assistant IA"
        description="Configurez le comportement de votre assistant"
      />

      <div className="glass rounded-2xl p-6 space-y-6">
        <div>
          <h4 className="text-sm font-medium text-white mb-4">Fournisseur d'IA</h4>
          <div className="grid grid-cols-2 gap-3">
            {availableProviders.map((p) => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                className={cn(
                  'px-4 py-3 rounded-xl text-sm font-medium transition-all border text-left',
                  provider === p
                    ? 'bg-axora-500/20 text-axora-400 border-axora-500/50'
                    : 'bg-white/5 text-white/60 border-transparent hover:bg-white/10 hover:text-white'
                )}
              >
                <div className="font-semibold">{PROVIDER_LABELS[p]}</div>
                <div className="text-xs opacity-70 mt-1 font-normal">
                  {PROVIDER_DESCRIPTIONS[p]}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="pt-6 border-t border-white/5">
          <h4 className="text-sm font-medium text-white mb-4">Modèle</h4>
          <div className="grid grid-cols-1 gap-2">
            {getModelsForProvider(provider).map((m) => (
              <button
                key={m}
                onClick={() => setModel(m)}
                title={`API: ${m}${MODEL_DESCRIPTIONS[m] ? `\n${MODEL_DESCRIPTIONS[m]}` : ''}`}
                className={cn(
                  'px-4 py-2.5 rounded-lg text-sm text-left transition-colors flex items-center justify-between',
                  model === m
                    ? 'bg-axora-500/20 text-axora-400'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                )}
              >
                <div>
                  <span className="font-medium">{getModelTierLabel(m)}</span>
                  <span className="text-white/40 ml-2 text-xs">({m})</span>
                </div>
                {model === m && (
                  <div className="w-2 h-2 rounded-full bg-axora-400" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Section personnalisation du prompt */}
        <div className="pt-6 border-t border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-medium text-white">Personnalité de l'assistant</h4>
              <p className="text-xs text-white/40 mt-0.5">
                Définissez le comportement et le style de réponse
              </p>
            </div>
            {isCustomPrompt && (
              <button
                onClick={resetSystemPrompt}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Réinitialiser
              </button>
            )}
          </div>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={10}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/40 focus:border-axora-500/50 focus:outline-none resize-none font-mono leading-relaxed"
            placeholder="Définissez la personnalité de votre assistant..."
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-white/40">
              {systemPrompt.length} caractères
            </p>
            {isCustomPrompt && (
              <p className="text-xs text-amber-400">
                Prompt personnalisé actif
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
