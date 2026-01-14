import { useState, useEffect } from 'react'
import { PPPData } from '../types'
import { getTheme } from '../utils/themes'
import '../styles/ppp-document.css'

interface PPPDocumentV2Props {
  data: PPPData
  onChange?: (data: PPPData) => void
  readOnly?: boolean
}

export function PPPDocumentV2({ data, onChange, readOnly = false }: PPPDocumentV2Props) {
  const theme = getTheme(data.ageRange)
  const [localData, setLocalData] = useState(data)

  useEffect(() => {
    setLocalData(data)
  }, [data])

  // Apply theme CSS variables
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--ppp-primary', theme.primaryColor)
    root.style.setProperty('--ppp-accent', theme.accentColor)
    root.style.setProperty('--ppp-dotted', `${theme.accentColor}88`) // 55% opacity
  }, [theme])

  const updateField = (field: keyof PPPData, value: string) => {
    const updated = { ...localData, [field]: value }
    setLocalData(updated)
    onChange?.(updated)
  }

  const updateArrayField = (field: 'priorities' | 'freins' | 'conseils' | 'ressources' | 'suivi', index: number, value: string) => {
    const updated = { ...localData }
    const array = [...updated[field]]
    array[index] = value
    updated[field] = array
    setLocalData(updated)
    onChange?.(updated)
  }

  // Calculate visible lines for each column (last filled + 2 buffer)
  const getVisibleLines = (items: string[]): number => {
    let lastFilled = -1
    items.forEach((item, i) => {
      if (item.trim()) lastFilled = i
    })
    return Math.min(lastFilled + 3, 8) // Max 8 lines
  }

  const renderColumn = (
    title: string,
    icon: string,
    items: string[],
    field: 'priorities' | 'freins' | 'conseils' | 'ressources',
    superscript?: string
  ) => {
    const visibleCount = getVisibleLines(items)

    return (
      <div className="ppp-column">
        <div className="ppp-col-title">
          <span className="ppp-col-icon">{icon}</span>
          <span>
            {title}
            {superscript && <sup>{superscript}</sup>}
          </span>
        </div>
        <ul className="ppp-lines">
          {Array.from({ length: visibleCount }).map((_, i) => (
            <li
              key={i}
              className="ppp-line"
              contentEditable={!readOnly}
              suppressContentEditableWarning
              onBlur={(e) => updateArrayField(field, i, e.currentTarget.textContent || '')}
            >
              {items[i] || ''}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="ppp-document-container">
      <div className="ppp-document">
        {/* HEADER */}
        <header className="ppp-header">
          {/* Top Row: Logo + Pharmacy Name | Title + Age */}
          <div className="ppp-header-top">
            <div className="ppp-pharmacy-branding">
              <div className="ppp-pharmacy-logo" />
              <div
                className="ppp-pharmacy-name"
                contentEditable={!readOnly}
                suppressContentEditableWarning
                onBlur={(e) => updateField('pharmacyName', e.currentTarget.textContent || '')}
              >
                {localData.pharmacyName}
              </div>
            </div>
            <div className="ppp-header-right">
              <h1 className="ppp-report-title">Mon Bilan Prévention</h1>
              <div className="ppp-age-badge">{data.ageRange}</div>
            </div>
          </div>

          {/* Bottom Row: Patient | Pharmacist | Date */}
          <div className="ppp-header-info">
            <div className="ppp-info-item">
              <span className="ppp-info-label">Patient :</span>
              <span
                className="ppp-info-value"
                contentEditable={!readOnly}
                suppressContentEditableWarning
                onBlur={(e) => updateField('patientName', e.currentTarget.textContent || '')}
                data-placeholder="Nom et prénom"
              >
                {localData.patientName}
              </span>
            </div>
            <div className="ppp-info-item">
              <span className="ppp-info-label">Pharmacien :</span>
              <span
                className="ppp-info-value"
                contentEditable={!readOnly}
                suppressContentEditableWarning
                onBlur={(e) => updateField('pharmacistName', e.currentTarget.textContent || '')}
              >
                {localData.pharmacistName}
              </span>
            </div>
            <div className="ppp-info-item">
              <span className="ppp-info-label">Date :</span>
              <span
                className="ppp-info-value"
                contentEditable={!readOnly}
                suppressContentEditableWarning
                onBlur={(e) => updateField('date', e.currentTarget.textContent || '')}
                data-placeholder="jj/mm/aaaa"
              >
                {localData.date}
              </span>
            </div>
          </div>
        </header>

        {/* HERO */}
        <section className="ppp-hero">
          <h1>Plan Personnalisé de Prévention</h1>
          <p>Rédaction partagée (par la personne et le professionnel de santé), à l'issue de l'intervention brève.</p>
        </section>

        {/* GRID - 4 columns */}
        <section className="ppp-grid">
          {renderColumn('Mes priorités en santé', '★', localData.priorities, 'priorities', '1')}
          {renderColumn('Freins rencontrés', '⚠', localData.freins, 'freins')}
          {renderColumn('Conseils, modalités pratiques', '✓', localData.conseils, 'conseils', '2')}
          {renderColumn('Ressources et intervenants', '➜', localData.ressources, 'ressources')}
        </section>

        {/* FOLLOW-UP */}
        <section className="ppp-follow-up">
          <div className="ppp-follow-title">Modalités de suivi</div>
          {Array.from({ length: getVisibleLines(localData.suivi) }).map((_, i) => (
            <div
              key={i}
              className="ppp-follow-line"
              contentEditable={!readOnly}
              suppressContentEditableWarning
              onBlur={(e) => updateArrayField('suivi', i, e.currentTarget.textContent || '')}
            >
              {localData.suivi[i] || ''}
            </div>
          ))}
        </section>

        <div className="ppp-separator" />

        {/* MOTIVATION */}
        <p className="ppp-motivation">
          Changer d'habitude n'est pas facile. Échanger avec une ou plusieurs personnes de confiance sur vos
          objectifs est un facteur de succès important pour maintenir votre motivation.
        </p>

        {/* CHECKBOX - Opposition */}
        <div className="ppp-checkbox-row">
          <label className="ppp-checkbox-label">
            <input
              type="checkbox"
              className="ppp-checkbox-input"
              checked={localData.opposeMedecin}
              onChange={(e) => {
                const updated = { ...localData, opposeMedecin: e.target.checked }
                setLocalData(updated)
                onChange?.(updated)
              }}
              disabled={readOnly}
            />
            <span className="ppp-checkbox" aria-hidden="true" />
            <span>Je m'oppose à ce que ce document soit communiqué à mon médecin traitant.</span>
          </label>
        </div>

        {/* FOOTER - 3 columns */}
        <footer className="ppp-footer">
          <section className="ppp-legal-mentions">
            <div className="ppp-legal-title">Mentions informatives</div>
            <ul>
              <li>
                Document à disposition du patient à l'issue du bilan de prévention, élaboré consciencieusement avec un
                professionnel de santé.
              </li>
              <li>
                Données issues du dossier pharmaceutique et de l'entretien ; à conserver à l'officine dans le dossier
                patient.
              </li>
              <li>
                Document pouvant être partagé avec le médecin traitant uniquement après accord du patient (cf. case
                d'opposition).
              </li>
            </ul>
          </section>

          <div className="ppp-footer-notes">
            <div className="item">
              <span className="n">1</span>Les priorités du PPP sont définies avec l'appui du professionnel de santé.
              Elles doivent être réalistes et en nombre limité.
            </div>
            <div className="item">
              <span className="n">2</span>Exemples d'actions précises : appeler un numéro de ligne d'écoute, expliquer
              ce qu'est une Consultation Jeunes Consommateurs et comment s'y rendre...
            </div>
          </div>

          <div className="ppp-signature-block">
            <div className="ppp-sig-label">Cachet de l'officine et Signature du professionnel de santé</div>
            <div className="ppp-sig-area" />
          </div>
        </footer>

      </div>
    </div>
  )
}
