import { AIService, AIModel, AIResponse, AIChatMessage } from "./types";

// Mistral API Key - same as used in phiVisionService
const MISTRAL_API_KEY = 'I9V9dMbmD0RYTX9cWZR7kvRbiFaC6hfi';

export class MistralProvider implements AIService {

    async initialize(): Promise<void> {
        // Direct API calls - no initialization needed
    }

    async generateResponse(messages: AIChatMessage[], modelId: string, _options?: { conversationId?: string }): Promise<AIResponse> {
        try {
            const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${MISTRAL_API_KEY}`
                },
                body: JSON.stringify({
                    model: modelId || 'ministral-8b-latest',
                    messages: messages.map(m => ({ role: m.role, content: m.content })),
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Mistral API Error: ${response.status} - ${error}`);
            }

            const data = await response.json();
            return { text: data.choices[0]?.message?.content || "" };
        } catch (error) {
            console.error("MistralProvider generateResponse Error:", error);
            throw error;
        }
    }

    async streamResponse(
        messages: AIChatMessage[],
        modelId: string,
        onChunk: (chunk: string) => void,
        _options?: { conversationId?: string }
    ): Promise<void> {
        try {
            const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${MISTRAL_API_KEY}`
                },
                body: JSON.stringify({
                    model: modelId || 'ministral-8b-latest',
                    messages: messages.map(m => ({ role: m.role, content: m.content })),
                    stream: true, // Enable streaming
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Mistral API Error: ${response.status} - ${error}`);
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            if (!reader) throw new Error("No reader available");

            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;

                // Process SSE lines from Mistral API
                const lines = buffer.split('\n');
                buffer = lines.pop() || "";

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (trimmedLine.startsWith('data: ')) {
                        const dataStr = trimmedLine.slice(6);
                        if (dataStr === '[DONE]') continue;

                        try {
                            const data = JSON.parse(dataStr);
                            // Mistral streaming format: choices[0].delta.content
                            const content = data.choices?.[0]?.delta?.content;
                            if (content) {
                                onChunk(content);
                            }
                        } catch (e) {
                            // Skip malformed JSON lines (can happen with partial chunks)
                        }
                    }
                }
            }
        } catch (error) {
            console.error("MistralProvider Stream Error:", error);
            throw error;
        }
    }

    getAvailableModels(): AIModel[] {
        return [
            { id: 'ministral-3b-2512', name: 'Ministral 3 3B', provider: 'mistral', description: 'Le plus efficient et compact (Edge).' },
            { id: 'ministral-14b-2512', name: 'Ministral 3 14B', provider: 'mistral', description: 'Performance optimale (Edge puissant).' },
            { id: 'mistral-large-latest', name: 'Mistral Large', provider: 'mistral', description: 'Le plus puissant (similaire GPT-4).' },
            { id: 'mistral-small-latest', name: 'Mistral Small', provider: 'mistral', description: 'Rapide et efficace.' },
            { id: 'codestral-latest', name: 'Codestral', provider: 'mistral', description: 'Spécialisé pour le code.' },
        ];
    }
}
