import { useState, useEffect } from 'react'
import { AIProvider } from '../types'
import { getAvailableProviders, getProviderModels } from '../services/AIService'

const STORAGE_KEYS = {
    PROVIDER: 'axora_ai_provider',
    MODEL: 'axora_ai_model'
}

export function useAIPreference() {
    const availableProviders = getAvailableProviders()

    // Initialize state from localStorage or defaults
    const [provider, setProvider] = useState<AIProvider>(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.PROVIDER) as AIProvider
        if (saved && availableProviders.includes(saved)) {
            return saved
        }
        // Default to Mistral if available, otherwise first available
        return availableProviders.includes('mistral') ? 'mistral' : availableProviders[0]
    })

    const [model, setModel] = useState<string>(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.MODEL)
        // Validate that the saved model belongs to the current provider (or the initial provider)
        const currentProvider = localStorage.getItem(STORAGE_KEYS.PROVIDER) as AIProvider || (availableProviders.includes('mistral') ? 'mistral' : availableProviders[0])
        const validModels = getProviderModels(currentProvider)

        if (saved && validModels.includes(saved)) {
            return saved
        }
        // Default to mistral-small-latest for Mistral, otherwise first available
        if (currentProvider === 'mistral') {
            return 'mistral-small-latest'
        }
        return validModels[0]
    })

    // Update localStorage when state changes
    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.PROVIDER, provider)
    }, [provider])

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.MODEL, model)
    }, [model])

    // Handle provider change to update valid models
    const updateProvider = (newProvider: AIProvider) => {
        setProvider(newProvider)
        const newModels = getProviderModels(newProvider)
        // If the current model is not valid for the new provider, switch to default
        if (!newModels.includes(model)) {
            // Default preference logic for specific providers
            if (newProvider === 'mistral') {
                setModel('mistral-small-latest')
            } else {
                setModel(newModels[0])
            }
        }
    }

    const updateModel = (newModel: string) => {
        setModel(newModel)
    }

    return {
        provider,
        model,
        setProvider: updateProvider,
        setModel: updateModel,
        availableProviders,
        getModelsForProvider: getProviderModels
    }
}
