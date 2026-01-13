import { Mail, Users, Search } from 'lucide-react'

export function Messaging() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center">
      <div className="w-20 h-20 rounded-2xl bg-surface-100 flex items-center justify-center mb-6">
        <Mail className="w-10 h-10 text-white/40" />
      </div>

      <h1 className="text-2xl font-semibold text-white mb-2">
        Messagerie
      </h1>

      <p className="text-white/60 max-w-md mb-8">
        La messagerie entre membres de l'équipe officinale sera disponible prochainement.
      </p>

      <div className="flex flex-col gap-4 max-w-sm w-full">
        <FeaturePreview
          icon={Users}
          title="Discussions d'équipe"
          description="Communiquez avec les membres de votre officine"
        />
        <FeaturePreview
          icon={Search}
          title="Recherche de pharmaciens"
          description="Trouvez et contactez d'autres pharmaciens"
        />
        <FeaturePreview
          icon={Mail}
          title="Messages privés"
          description="Conversations individuelles sécurisées"
        />
      </div>
    </div>
  )
}

interface FeaturePreviewProps {
  icon: React.ElementType
  title: string
  description: string
}

function FeaturePreview({ icon: Icon, title, description }: FeaturePreviewProps) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 text-left">
      <div className="w-10 h-10 rounded-lg bg-axora-500/20 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-axora-400" />
      </div>
      <div>
        <h3 className="font-medium text-white">{title}</h3>
        <p className="text-sm text-white/50 mt-0.5">{description}</p>
      </div>
    </div>
  )
}
