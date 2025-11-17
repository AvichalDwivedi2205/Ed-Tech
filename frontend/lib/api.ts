import axios from 'axios';

// Get API base URL from environment variable or use default
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Roadmap API
export const roadmapApi = {
  /**
   * Generate a roadmap from user input
   */
  async generate(
    userInput: string,
    file?: File,
    sessionId?: string,
    conversationHistory?: Array<{ role: string; content: string }>
  ) {
    const formData = new FormData();
    formData.append('user_input', userInput);

    if (file) {
      formData.append('file', file);
    }

    if (sessionId) {
      formData.append('session_id', sessionId);
    }

    if (conversationHistory && conversationHistory.length > 0) {
      formData.append('conversation_history', JSON.stringify(conversationHistory));
    }

    const response = await apiClient.post('/roadmap/generate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  /**
   * Continue clarification conversation
   */
  async clarify(userResponse: string, sessionId: string) {
    const response = await apiClient.post('/roadmap/clarify', {
      user_response: userResponse,
      session_id: sessionId,
    });

    return response.data;
  },

  /**
   * Get roadmap generation status
   */
  async getStatus(sessionId: string) {
    const response = await apiClient.get(`/roadmap/status/${sessionId}`);
    return response.data;
  },
};

// Content API
export const contentApi = {
  /**
   * Generate content for a subtopic
   */
  async generate(roadmapJson: any, subtopicId?: string) {
    const response = await apiClient.post('/content/generate', {
      roadmap_json: roadmapJson,
      subtopic_id: subtopicId,
    });

    return response.data;
  },

  /**
   * Get content generation progress
   */
  async getProgress(taskId: string) {
    const response = await apiClient.get(`/content/progress/${taskId}`);
    return response.data;
  },

  /**
   * Get list of completed subtopics
   */
  async getCompleted() {
    const response = await apiClient.get('/content/completed');
    return response.data;
  },

  /**
   * Reset context manager
   */
  async resetContext() {
    const response = await apiClient.post('/content/reset-context');
    return response.data;
  },

  /**
   * Generate mega quiz covering all subtopics
   */
  async generateMegaQuiz() {
    const response = await apiClient.post('/content/mega-quiz');
    return response.data;
  },
};

// Health check
export const healthApi = {
  async check() {
    const response = await apiClient.get('/health');
    return response.data;
  },
};

export default apiClient;
