export class ChatService {
    constructor(host) {
        this.host = host; // Kept for potential fallback, but not used for window.ai
        this.abortController = new AbortController();
        this.aiSession = null;
        this.clonedSessions = new Map();
        this.isSupported = false;
    }

    async initialize() {
        const availability = await LanguageModel.availability();
        if (availability === 'available') {
            this.isSupported = true;
            this.aiSession =  await LanguageModel.create();
            return true;
        }
        return false;
    }

    async getTitle(sessionId, userContent) {
        const systemPrompt = "You are an AI assistant. Generate a concise, engaging title under 6 words that reflects the core intent of the user's first message, from their perspective. The title should summarize the query clearly to aid in future searchability. Respond *only* with the title—no explanations.";
        const userPrompt = `Generate a title for this message: '${userContent}'.`;
        const fullPrompt = `${systemPrompt}\n\nUser: ${userPrompt}\nAssistant:`;

        const session = await this._getClonedSession(sessionId);
        const titleResponse = await session.prompt(fullPrompt);

        if (titleResponse) {
            return titleResponse.trim();
        }
        return null;
    }

    async chat(sessionId, options, signal = this.abortController.signal) {
        try {
            if (!this.isSupported || !this.aiSession) {
                throw new Error("Chrome AI is not supported or initialized.");
            }
            // The prompt() method takes a single string.
            // We need to format messages into a single prompt string.
            const session = await this._getClonedSession(sessionId);
            const prompt = this.formatPrompt(options.messages);
            return await session.prompt(prompt, { signal, temperature: options.options?.temperature });
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn('Request aborted by user.');
            } else {
                console.error('Error in chat:', error);
                throw error;
            }
        }
    }

    async *streamChat(sessionId, options, signal = this.abortController.signal) {
        try {
            if (!this.isSupported || !this.aiSession) {
                throw new Error("Chrome AI is not supported or initialized.");
            }
            const prompt = this.formatPrompt(options.messages);
            const session = await this._getClonedSession(sessionId);
            const stream = await session.promptStreaming(prompt, { signal, temperature: options.options?.temperature });

            for await (const chunk of stream) {
                yield {
                    message: {
                        content: chunk
                    }
                };
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn('Request aborted by user.');
            } else {
                console.error('Error in streamChat:', error);
                throw error;
            }
        }
    }

    async list() {
        if (this.isSupported) {
            // window.ai doesn't expose model names, so we return a mock list.
            return {
                models: [
                    { name: 'chromeAI:gemini-nano', details: { family: 'gemini' } }
                ]
            };
        } else {
            // Fallback to original behavior if window.ai is not supported
            try {
                const response = await fetch(`${this.host}/api/tags`);
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return await response.json();
            } catch (error) {
                console.error('Error in list:', error);
                throw error;
            }
        }
    }

    formatPrompt(messages) {
        return messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
    }

    abort() {
        this.abortController.abort();
        this.abortController = new AbortController();
        console.warn('ChatService Aborted');
    }

    destroy() {
        // Destroy the main session
        if (this.aiSession) {
            this.aiSession.destroy();
            console.log('Main AI session destroyed.');
        }
        // Destroy all cloned sessions
        for (const [sessionId, sessionData] of this.clonedSessions.entries()) {
            if (sessionData.timerId) clearTimeout(sessionData.timerId);
            sessionData.session.destroy();
            console.log(`Destroyed cloned AI session for chat session ID: ${sessionId}`);
        }
        this.clonedSessions.clear();
    }

    async _getClonedSession(sessionId) {
        if (this.clonedSessions.has(sessionId)) {
            const sessionData = this.clonedSessions.get(sessionId);
            clearTimeout(sessionData.timerId); // Clear previous inactivity timer
            this.clonedSessions.set(sessionId, { ...sessionData, timerId: this._createDestructionTimer(sessionId) });
            return sessionData.session;
        }

        const newSession = await this.aiSession.clone();
        this.clonedSessions.set(sessionId, { session: newSession, timerId: this._createDestructionTimer(sessionId) });
        return newSession;
    }

    _createDestructionTimer(sessionId) {
        return setTimeout(() => {
            this.clonedSessions.get(sessionId)?.session.destroy();
            this.clonedSessions.delete(sessionId);
            console.log(`Destroyed inactive AI session for chat session ID: ${sessionId}`);
        }, 5 * 60 * 1000); // 5 minutes
    }
}