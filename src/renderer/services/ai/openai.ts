import OpenAI from 'openai';
import { AIService, AIModel, AIResponse, AIChatMessage } from "./types";

export class OpenAIProvider implements AIService {
    private openai: OpenAI | null = null;
    private apiKey: string | null = null;

    async initialize(): Promise<void> {
        const storedKey = localStorage.getItem('axora_openai_key');
        if (storedKey) {
            this.configure(storedKey);
        } else if (process.env.OPENAI_API_KEY) {
            this.configure(process.env.OPENAI_API_KEY);
        }
    }

    configure(apiKey: string) {
        this.apiKey = apiKey;
        this.openai = new OpenAI({
            apiKey: apiKey,
            dangerouslyAllowBrowser: true // Usage client-side assumed for this personal project
        });
        localStorage.setItem('axora_openai_key', apiKey);
    }

    async generateResponse(messages: AIChatMessage[], modelId: string, _options?: { conversationId?: string }): Promise<AIResponse> {
        if (!this.apiKey) {
            await this.initialize();
        }
        if (!this.openai) throw new Error("Clé API OpenAI manquante.");

        // Support specific for GPT-5 endpoint (responses.create) which is hypothetical here or custom
        if (modelId.startsWith('gpt-5') || modelId === 'gpt-5.2') {
            try {
                // @ts-ignore - New API not typed yet
                const response = await this.openai.responses.create({
                    model: modelId,
                    input: messages[messages.length - 1].content // Simplification for now
                });
                return {
                    text: response.output_text || "",
                };
            } catch (e) {
                console.error("Erreur API GPT-5:", e);
                throw e;
            }
        }

        const completion = await this.openai.chat.completions.create({
            messages: messages,
            model: modelId,
        });

        return {
            text: completion.choices[0].message.content || "",
        };
    }

    async streamResponse(messages: AIChatMessage[], modelId: string, onChunk: (chunk: string) => void, _options?: { conversationId?: string }): Promise<void> {
        if (!this.apiKey) {
            await this.initialize();
        }
        if (!this.openai) throw new Error("Clé API OpenAI manquante.");

        if (modelId.startsWith('gpt-5') || modelId === 'gpt-5.2') {
            try {
                // @ts-ignore - New API streaming
                const stream = await this.openai.responses.stream({
                    model: modelId,
                    input: messages[messages.length - 1].content
                });

                for await (const event of stream) {
                    if (event.type === 'response.output_text.delta') {
                        onChunk(event.delta);
                    }
                }
            } catch (e) {
                console.warn("Streaming GPT-5 expérimental échoué, bascule sur streaming standard:", e);
                // Fallback : Streaming standard OpenAI
                const stream = await this.openai.chat.completions.create({
                    model: modelId,
                    messages: messages,
                    stream: true,
                });

                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    if (content) onChunk(content);
                }
            }
            return;
        }

        const stream = await this.openai.chat.completions.create({
            model: modelId,
            messages: messages,
            stream: true,
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) onChunk(content);
        }
    }

    getAvailableModels(): AIModel[] {
        return [
            { id: 'gpt-5-nano', name: 'GPT-5 Nano', provider: 'online', description: 'Ultra-rapide et économique.' },
            { id: 'gpt-5-mini', name: 'GPT-5 Mini', provider: 'online', description: 'Le standard équilibré.' },
            { id: 'gpt-5.2', name: 'GPT-5.2', provider: 'online', description: 'Haute Intelligence (Dernier cri).' },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'online', description: 'Le standard actuel (Rapide & Efficace).' },
            { id: 'gpt-4o', name: 'GPT-4o', provider: 'online', description: 'Haute Intelligence (Dernier modèle).' },
            { id: 'o1-preview', name: 'OpenAI o1-preview', provider: 'online', description: 'Capacités de raisonnement avancées.' },
        ];
    }
}
