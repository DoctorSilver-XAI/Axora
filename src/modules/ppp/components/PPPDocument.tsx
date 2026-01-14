import { useState, useEffect, useRef } from 'react'
import { cn } from '@shared/utils/cn'
import { PPPData } from '../types'
import { getTheme } from '../utils/themes'

interface PPPDocumentProps {
  data: PPPData
  onChange?: (data: PPPData) => void
  isPreview?: boolean
}

export function PPPDocument({ data, onChange, isPreview = false }: PPPDocumentProps) {
  const theme = getTheme(data.ageRange)
  const [editableData, setEditableData] = useState(data)

  // Update editable data when prop changes
  useEffect(() => {
    setEditableData(data)
  }, [data])

  // Update individual line content
  const updateLine = (column: keyof Pick<PPPData, 'priorities' | 'freins' | 'conseils' | 'ressources' | 'suivi'>, index: number, value: string) => {
    const newData = { ...editableData }
    const columnData = [...newData[column]]
    columnData[index] = value
    newData[column] = columnData
    setEditableData(newData)
    onChange?.(newData)
  }

  // Render editable lines for a column
  const renderColumn = (
    title: string,
    icon: string,
    items: string[],
    column: keyof Pick<PPPData, 'priorities' | 'freins' | 'conseils' | 'ressources'>
  ) => {
    // Calculate last filled index
    const lastFilledIndex = items.reduce((acc, item, i) => (item.trim() ? i : acc), -1)
    const visibleCount = Math.min(lastFilledIndex + 3, 8) // Show up to 2 empty lines after last filled

    return (
      <div className="flex-1">
        <div
          className="font-bold text-sm mb-3 flex items-center gap-2"
          style={{ color: theme.primaryColor }}
        >
          <span>{icon}</span>
          <span>{title}</span>
        </div>
        <ul className="space-y-2">
          {Array.from({ length: visibleCount }).map((_, i) => (
            <li
              key={i}
              contentEditable={!isPreview}
              suppressContentEditableWarning
              onBlur={(e) => updateLine(column, i, e.currentTarget.textContent || '')}
              className={cn(
                'min-h-[2rem] px-2 py-1 text-xs leading-relaxed outline-none',
                !isPreview && 'border-b-2 border-dotted hover:bg-black/5 focus:bg-black/5',
                'whitespace-pre-wrap'
              )}
              style={{
                borderColor: isPreview ? 'transparent' : `${theme.primaryColor}40`,
              }}
            >
              {items[i] || ''}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="bg-white text-black p-8 rounded-xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 pb-4 border-b-2" style={{ borderColor: theme.primaryColor }}>
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-lg"
            style={{
              background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.accentColor})`,
            }}
          />
          <div
            contentEditable={!isPreview}
            suppressContentEditableWarning
            onBlur={(e) => {
              const newData = { ...editableData, pharmacyName: e.currentTarget.textContent || '' }
              setEditableData(newData)
              onChange?.(newData)
            }}
            className={cn(
              'text-xl font-bold outline-none',
              !isPreview && 'hover:bg-black/5 px-2 py-1 rounded'
            )}
            style={{ color: theme.primaryColor }}
          >
            {editableData.pharmacyName}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold" style={{ color: theme.primaryColor }}>
            Mon Bilan Prévention
          </div>
          <div className="text-lg font-semibold mt-1" style={{ color: theme.accentColor }}>
            {data.ageRange}
          </div>
        </div>
      </div>

      {/* Patient Info */}
      <div className="grid grid-cols-3 gap-4 text-sm mb-6">
        <div>
          <span className="font-medium" style={{ color: theme.primaryColor }}>Patient :</span>{' '}
          <span
            contentEditable={!isPreview}
            suppressContentEditableWarning
            onBlur={(e) => {
              const newData = { ...editableData, patientName: e.currentTarget.textContent || '' }
              setEditableData(newData)
              onChange?.(newData)
            }}
            className={cn(
              'outline-none',
              !isPreview && 'hover:bg-black/5 px-1 rounded border-b border-dotted'
            )}
          >
            {editableData.patientName}
          </span>
        </div>
        <div>
          <span className="font-medium" style={{ color: theme.primaryColor }}>Pharmacien :</span>{' '}
          <span>{editableData.pharmacistName}</span>
        </div>
        <div>
          <span className="font-medium" style={{ color: theme.primaryColor }}>Date :</span>{' '}
          <span
            contentEditable={!isPreview}
            suppressContentEditableWarning
            onBlur={(e) => {
              const newData = { ...editableData, date: e.currentTarget.textContent || '' }
              setEditableData(newData)
              onChange?.(newData)
            }}
            className={cn(
              'outline-none',
              !isPreview && 'hover:bg-black/5 px-1 rounded border-b border-dotted'
            )}
          >
            {editableData.date}
          </span>
        </div>
      </div>

      {/* Title Section */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold mb-2" style={{ color: theme.primaryColor }}>
          Plan Personnalisé de Prévention
        </h1>
        <p className="text-sm text-gray-600">
          Rédaction partagée (par la personne et le professionnel de santé), à l'issue de l'intervention brève.
        </p>
      </div>

      {/* Four Columns Grid */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {renderColumn('Mes priorités en santé', '★', editableData.priorities, 'priorities')}
        {renderColumn('Freins rencontrés', '⚠', editableData.freins, 'freins')}
        {renderColumn('Conseils, modalités pratiques', '✓', editableData.conseils, 'conseils')}
        {renderColumn('Ressources et intervenants', '➜', editableData.ressources, 'ressources')}
      </div>

      {/* Follow-up Section */}
      <div className="mb-6">
        <div
          className="font-bold text-sm mb-3 inline-block px-4 py-2 rounded-lg text-white"
          style={{ backgroundColor: theme.primaryColor }}
        >
          Modalités de suivi
        </div>
        <ul className="space-y-2">
          {Array.from({ length: Math.min(editableData.suivi.length + 2, 5) }).map((_, i) => (
            <li
              key={i}
              contentEditable={!isPreview}
              suppressContentEditableWarning
              onBlur={(e) => updateLine('suivi', i, e.currentTarget.textContent || '')}
              className={cn(
                'min-h-[2rem] px-2 py-1 text-xs leading-relaxed outline-none',
                !isPreview && 'border-b-2 border-dotted hover:bg-black/5 focus:bg-black/5'
              )}
              style={{
                borderColor: isPreview ? 'transparent' : `${theme.primaryColor}40`,
              }}
            >
              {editableData.suivi[i] || ''}
            </li>
          ))}
        </ul>
      </div>

      {/* Motivation Text */}
      <div className="my-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-700 italic">
        Changer d'habitude n'est pas facile. Échanger avec une ou plusieurs personnes de confiance sur vos objectifs
        est un facteur de succès important pour maintenir votre motivation.
      </div>

      {/* Opposition Checkbox */}
      <div className="mb-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={editableData.opposeMedecin}
            onChange={(e) => {
              const newData = { ...editableData, opposeMedecin: e.target.checked }
              setEditableData(newData)
              onChange?.(newData)
            }}
            disabled={isPreview}
            className="mt-1"
          />
          <span className="text-sm">
            Je m'oppose à ce que ce document soit communiqué à mon médecin traitant.
          </span>
        </label>
      </div>

      {/* Footer */}
      <div className="grid grid-cols-2 gap-6 text-xs">
        <div>
          <div className="font-bold mb-2">Mentions informatives</div>
          <ul className="space-y-1 text-gray-600">
            <li>• Document à disposition du patient à l'issue du bilan de prévention</li>
            <li>• Données issues du dossier pharmaceutique et de l'entretien</li>
            <li>• Document partageable avec le médecin traitant après accord du patient</li>
          </ul>
        </div>

        <div>
          <div className="font-bold mb-2">Cachet et Signature</div>
          <div className="border-2 border-dashed border-gray-300 h-24 rounded" />
        </div>
      </div>
    </div>
  )
}
