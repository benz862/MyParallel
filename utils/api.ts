// API base URL configuration
// Defaults to ngrok URL since backend is accessible via ngrok
const getApiBaseUrl = (): string => {
  // Check if we have an explicit API URL in environment
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Default to ngrok URL (backend is accessible via ngrok)
  // To use local backend instead, set VITE_USE_LOCAL=true in .env
  if (import.meta.env.VITE_USE_LOCAL === 'true') {
    return ''; // Use relative URLs (Vite proxy to localhost:8080)
  }
  
  // Default: Use ngrok URL
  return 'https://else-monocarpellary-georgie.ngrok-free.dev';
};

export const API_BASE_URL = getApiBaseUrl();

export const api = {
  get: async (endpoint: string, userId?: string) => {
    const url = userId 
      ? `${API_BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}userId=${userId}`
      : `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'ngrok-skip-browser-warning': 'true', // Skip ngrok browser warning
      },
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.statusText} - ${errorText}`);
    }
    return response.json();
  },
  
  post: async (endpoint: string, data: any) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true', // Skip ngrok browser warning
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      let errorText = '';
      try {
        const errorJson = await response.json();
        errorText = errorJson.error || JSON.stringify(errorJson);
      } catch {
        errorText = await response.text();
      }
      const error = new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
      (error as any).status = response.status;
      (error as any).response = errorText;
      throw error;
    }
    return response.json();
  },
};

