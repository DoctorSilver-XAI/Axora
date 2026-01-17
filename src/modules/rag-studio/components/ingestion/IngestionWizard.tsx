/**
 * IngestionWizard - Orchestrateur du pipeline d'ingestion
 * Gère le flux multi-étapes avec 2 modes :
 * - Structuré : Mode → Upload → Validation → Ingestion
 * - AI-Enriched : Mode → Upload → Enrichissement AI + Review → Ingestion
 */

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IngestionMode, ProcessedDocument, IndexDefinition } from '../../types'
import { ValidationService } from '../../services/ValidationService'
import { IndexRegistry } from '../../services/IndexRegistry'
import { ModeSelector } from './ModeSelector'
import { JSONUploader } from './JSONUploader'
import { SchemaValidator } from './SchemaValidator'
import { IngestionProgress } from './IngestionProgress'
import { AIEnrichmentPipeline } from './AIEnrichmentPipeline'
import { NaturalLanguageInput } from './NaturalLanguageInput'
import { NaturalLanguagePipeline } from './NaturalLanguagePipeline'

interface IngestionWizardProps {
  indexId: string
  onComplete?: () => void
}

type WizardStep = 'mode' | 'upload' | 'validate' | 'ai-enrich' | 'nl-input' | 'nl-enrich' | 'ingest'

export function IngestionWizard({ indexId, onComplete }: IngestionWizardProps) {
  // État du wizard
  const [currentStep, setCurrentStep] = useState<WizardStep>('mode')
  const [selectedMode, setSelectedMode] = useState<IngestionMode | null>(null)
  const [rawDocuments, setRawDocuments] = useState<Record<string, unknown>[] | null>(null)
  const [productNames, setProductNames] = useState<string[]>([]) // Pour le mode langage naturel
  const [processedDocuments, setProcessedDocuments] = useState<ProcessedDocument[]>([])
  const [documentsToIngest, setDocumentsToIngest] = useState<ProcessedDocument[]>([])

  // État du sélecteur d'index
  const [availableIndexes, setAvailableIndexes] = useState<IndexDefinition[]>([])
  const [selectedIndexId, setSelectedIndexId] = useState<string>(indexId)

  // Charger les index custom disponibles au montage
  useEffect(() => {
    const loadIndexes = async () => {
      await IndexRegistry.loadCustomIndexes()
      // Filtrer uniquement les index qui acceptent l'ingestion (custom indexes)
      const customIndexes = IndexRegistry.getAll().filter((idx) => idx._isCustom)
      setAvailableIndexes(customIndexes)
    }
    loadIndexes()
  }, [])

  // Handlers de navigation
  const handleModeSelected = useCallback((mode: IngestionMode) => {
    setSelectedMode(mode)
  }, [])

  const handleModeContinue = useCallback(() => {
    if (selectedMode) {
      // Le mode langage naturel va directement à l'input texte
      if (selectedMode === 'natural-language') {
        setCurrentStep('nl-input')
      } else {
        setCurrentStep('upload')
      }
    }
  }, [selectedMode])

  const handleDataLoaded = useCallback((data: Record<string, unknown>[]) => {
    setRawDocuments(data)
  }, [])

  const handleUploadContinue = useCallback(() => {
    if (rawDocuments && rawDocuments.length > 0) {
      // Brancher selon le mode sélectionné
      if (selectedMode === 'ai-enriched') {
        // Mode AI : aller directement à l'enrichissement
        setCurrentStep('ai-enrich')
      } else {
        // Mode structuré : valider les documents d'abord
        const processed = ValidationService.validateBatch(rawDocuments, selectedIndexId)
        setProcessedDocuments(processed)
        setCurrentStep('validate')
      }
    }
  }, [rawDocuments, selectedIndexId, selectedMode])

  const handleUploadBack = useCallback(() => {
    setCurrentStep('mode')
  }, [])

  const handleValidateContinue = useCallback((validDocs: ProcessedDocument[]) => {
    setDocumentsToIngest(validDocs)
    setCurrentStep('ingest')
  }, [])

  const handleValidateBack = useCallback(() => {
    setCurrentStep('upload')
  }, [])

  // Handlers pour le mode AI enrichment
  const handleAIEnrichmentContinue = useCallback((validDocs: ProcessedDocument[]) => {
    setDocumentsToIngest(validDocs)
    setCurrentStep('ingest')
  }, [])

  const handleAIEnrichmentBack = useCallback(() => {
    // Retour selon le mode
    if (selectedMode === 'natural-language') {
      setCurrentStep('nl-input')
    } else {
      setCurrentStep('upload')
    }
  }, [selectedMode])

  // Handlers pour le mode langage naturel (Mistral)
  const handleNLInputContinue = useCallback((names: string[]) => {
    setProductNames(names)
    setCurrentStep('nl-enrich')
  }, [])

  const handleNLInputBack = useCallback(() => {
    setCurrentStep('mode')
  }, [])

  const handleNLEnrichContinue = useCallback((validDocs: ProcessedDocument[]) => {
    setDocumentsToIngest(validDocs)
    setCurrentStep('ingest')
  }, [])

  const handleNLEnrichBack = useCallback(() => {
    setCurrentStep('nl-input')
  }, [])

  const handleIngestionComplete = useCallback(() => {
    // Optionnel : callback pour refresh le dashboard
    onComplete?.()
  }, [onComplete])

  const handleReset = useCallback(() => {
    setCurrentStep('mode')
    setSelectedMode(null)
    setRawDocuments(null)
    setProductNames([])
    setProcessedDocuments([])
    setDocumentsToIngest([])
  }, [])

  // Rendu avec animation de transition
  return (
    <div className="h-full flex flex-col">
      {/* Progress indicator */}
      <WizardProgress currentStep={currentStep} mode={selectedMode} />

      {/* Step content */}
      <div className="flex-1 min-h-0">
        <AnimatePresence mode="wait">
          {currentStep === 'mode' && (
            <StepWrapper key="mode">
              <ModeSelector
                selectedMode={selectedMode}
                onSelectMode={handleModeSelected}
                onContinue={handleModeContinue}
                availableIndexes={availableIndexes}
                selectedIndexId={selectedIndexId}
                onSelectIndex={setSelectedIndexId}
              />
            </StepWrapper>
          )}

          {currentStep === 'upload' && (
            <StepWrapper key="upload">
              <JSONUploader
                loadedData={rawDocuments}
                onDataLoaded={handleDataLoaded}
                onBack={handleUploadBack}
                onContinue={handleUploadContinue}
              />
            </StepWrapper>
          )}

          {currentStep === 'validate' && (
            <StepWrapper key="validate">
              <SchemaValidator
                documents={processedDocuments}
                indexId={selectedIndexId}
                onBack={handleValidateBack}
                onContinue={handleValidateContinue}
                onDocumentsUpdated={setProcessedDocuments}
              />
            </StepWrapper>
          )}

          {currentStep === 'nl-input' && (
            <StepWrapper key="nl-input">
              <NaturalLanguageInput
                onBack={handleNLInputBack}
                onContinue={handleNLInputContinue}
              />
            </StepWrapper>
          )}

          {currentStep === 'nl-enrich' && productNames.length > 0 && (
            <StepWrapper key="nl-enrich">
              <NaturalLanguagePipeline
                productNames={productNames}
                indexId={selectedIndexId}
                onBack={handleNLEnrichBack}
                onContinue={handleNLEnrichContinue}
              />
            </StepWrapper>
          )}

          {currentStep === 'ai-enrich' && rawDocuments && (
            <StepWrapper key="ai-enrich">
              <AIEnrichmentPipeline
                rawDocuments={rawDocuments}
                indexId={selectedIndexId}
                onBack={handleAIEnrichmentBack}
                onContinue={handleAIEnrichmentContinue}
              />
            </StepWrapper>
          )}

          {currentStep === 'ingest' && (
            <StepWrapper key="ingest">
              <IngestionProgress
                documents={documentsToIngest}
                indexId={selectedIndexId}
                onComplete={handleIngestionComplete}
                onReset={handleReset}
              />
            </StepWrapper>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// Wrapper pour les animations de transition
function StepWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      {children}
    </motion.div>
  )
}

// Indicateur de progression du wizard
function WizardProgress({ currentStep, mode }: { currentStep: WizardStep; mode: IngestionMode | null }) {
  // Étapes différentes selon le mode
  const getSteps = () => {
    switch (mode) {
      case 'natural-language':
        return [
          { id: 'mode', label: 'Mode' },
          { id: 'nl-input', label: 'Saisie' },
          { id: 'nl-enrich', label: 'Mistral AI' },
          { id: 'ingest', label: 'Ingestion' },
        ]
      case 'ai-enriched':
        return [
          { id: 'mode', label: 'Mode' },
          { id: 'upload', label: 'Import' },
          { id: 'ai-enrich', label: 'Enrichissement' },
          { id: 'ingest', label: 'Ingestion' },
        ]
      default:
        return [
          { id: 'mode', label: 'Mode' },
          { id: 'upload', label: 'Import' },
          { id: 'validate', label: 'Validation' },
          { id: 'ingest', label: 'Ingestion' },
        ]
    }
  }

  const steps = getSteps()
  const currentIndex = steps.findIndex((s) => s.id === currentStep)

  return (
    <div className="px-6 py-4 border-b border-white/5 bg-surface-50/30">
      <div className="flex items-center justify-center gap-2">
        {steps.map((step, index) => {
          const isActive = index === currentIndex
          const isComplete = index < currentIndex

          return (
            <div key={step.id} className="flex items-center">
              {/* Step indicator */}
              <div className="flex items-center gap-2">
                <div
                  className={`
                    w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium
                    transition-all duration-200
                    ${
                      isComplete
                        ? 'bg-axora-500 text-white'
                        : isActive
                          ? 'bg-axora-500/20 text-axora-400 ring-2 ring-axora-500/50'
                          : 'bg-white/5 text-white/30'
                    }
                  `}
                >
                  {isComplete ? '✓' : index + 1}
                </div>
                <span
                  className={`
                    text-sm hidden sm:block
                    ${isActive ? 'text-white font-medium' : isComplete ? 'text-axora-400' : 'text-white/30'}
                  `}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector */}
              {index < steps.length - 1 && (
                <div
                  className={`
                    w-8 h-0.5 mx-3
                    ${index < currentIndex ? 'bg-axora-500' : 'bg-white/10'}
                  `}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
