const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export const aiService = {
  /**
   * Uses AI to extract or infer drug-related keywords from a user query.
   */
  async getSearchKeywords(message: string): Promise<string> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/keywords`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        console.warn('Keywords API error:', response.status);
        return message;
      }

      const data = await response.json();
      return data.keywords || message;
    } catch (error) {
      console.error('Error getting search keywords:', error);
      return message;
    }
  },

  /**
   * Sends a text message to the AI backend and returns the structured reply.
   */
  async sendMessageByText(
    message: string,
    mode: 'general' | 'fast_recap' = 'general',
  ): Promise<string> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, mode }),
      });

      if (!response.ok) {
        console.error('Chat API error:', response.status);
        return "I'm sorry, I'm having trouble connecting to the server right now. Please try again.";
      }

      const data = await response.json();
      return data.reply || "I'm sorry, I received an empty response. Please try again.";
    } catch (error) {
      console.error('AI Service Error:', error);
      return "I'm sorry, I can't reach the server right now. Make sure the backend is running.";
    }
  },

  async processAudio(
    base64Audio: string,
    mimeType: string = 'audio/m4a',
  ): Promise<{ text: string; reply: string }> {
    // Audio transcription still requires a direct Gemini call with inline binary data.
    // For now this returns a notice; wire up a /api/transcribe endpoint if needed.
    return {
      text: '(Audio processing unavailable)',
      reply:
        'Voice input is not supported in this version. Please type your question.',
    };
  },
};
