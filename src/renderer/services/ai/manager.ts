import { AIService, AIModel, AIResponse, AIChatMessage } from './types';
import { OpenAIProvider } from './openai';
import { MistralProvider } from './mistral';

export class AIServiceManager {
    private static instance: AIServiceManager;
    private providers: { [key: string]: AIService } = {};
    private activeProviderId: 'online' | 'mistral' = 'mistral';
    private activeModelId: string | null = null;

    private constructor() {
        this.providers['online'] = new OpenAIProvider();
        this.providers['mistral'] = new MistralProvider();

        // Restore preferences
        const savedProvider = localStorage.getItem('axora_active_provider');
        if (savedProvider === 'online' || savedProvider === 'mistral') {
            this.activeProviderId = savedProvider as any;
        }

        const savedModel = localStorage.getItem('axora_active_model');
        if (savedModel) {
            this.activeModelId = savedModel;
        }
    }

    static getInstance(): AIServiceManager {
        if (!AIServiceManager.instance) {
            AIServiceManager.instance = new AIServiceManager();
        }
        return AIServiceManager.instance;
    }

    async initialize() {
        await this.providers['online'].initialize();
        await this.providers['mistral'].initialize();
    }

    getProvider(type: 'online' | 'mistral'): AIService {
        return this.providers[type];
    }

    setActiveModel(modelId: string, providerType: 'online' | 'mistral') {
        this.activeModelId = modelId;
        this.activeProviderId = providerType;

        // Persist preferences
        localStorage.setItem('axora_active_provider', providerType);
        localStorage.setItem('axora_active_model', modelId);
    }

    getActiveProvider(): AIService {
        return this.providers[this.activeProviderId];
    }

    getActiveModelId(): string {
        // Fallback defaults
        if (!this.activeModelId) {
            return 'ministral-14b-2512';
        }
        return this.activeModelId;
    }

    getAllModels(): AIModel[] {
        return [
            ...this.providers['online'].getAvailableModels(),
            ...this.providers['mistral'].getAvailableModels()
        ];
    }

    // Proxy methods
    async generateResponse(messages: AIChatMessage[], options?: { conversationId?: string }): Promise<AIResponse> {
        return this.getActiveProvider().generateResponse(messages, this.getActiveModelId(), options);
    }

    async streamResponse(messages: AIChatMessage[], onChunk: (chunk: string) => void, options?: { conversationId?: string }): Promise<void> {
        return this.getActiveProvider().streamResponse(messages, this.getActiveModelId(), onChunk, options);
    }
}

export const aiManager = AIServiceManager.getInstance();
