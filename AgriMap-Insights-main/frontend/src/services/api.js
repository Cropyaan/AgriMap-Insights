import axios from 'axios';

// STRICT ENV USAGE: No fallback to localhost in production
const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  console.error('[AgriMap] CRITICAL: VITE_API_URL is not defined! API calls will fail.');
} else {
  console.log(`[AgriMap] Initializing with API_URL: ${API_URL}`);
}

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // Increased timeout for cold starts
});

// Retry Logic for Render Cold Starts (3 attempts)
api.interceptors.response.use(null, async (error) => {
  const { config, response } = error;
  
  // If no config or no retry set, reject
  if (!config || config._retryCount >= 3) {
    return Promise.reject(error);
  }

  // Only retry on network errors or 503/504 (server waking up/timeout)
  if (!response || response.status === 503 || response.status === 504 || error.code === 'ECONNABORTED') {
    config._retryCount = (config._retryCount || 0) + 1;
    console.warn(`[AgriMap] Retry attempt ${config._retryCount} for ${config.url}`);
    
    // Exponential backoff
    const backoff = new Promise((resolve) => {
      setTimeout(() => resolve(), config._retryCount * 2000);
    });
    
    await backoff;
    return api(config);
  }

  return Promise.reject(error);
});

// Debug Logging
api.interceptors.request.use((config) => {
  console.log(`[AgriMap Request] ${config.method.toUpperCase()} ${config.baseURL}${config.url}`);
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[AgriMap API Error]', error.response || error.message);
    
    if (!error.response) {
      error.userMessage = "Network error. Please check your internet or if the backend is down.";
    } else if (error.response.status >= 500) {
      error.userMessage = "Server error. We're working on it!";
    } else {
      error.userMessage = error.response.data?.detail || "An unexpected error occurred.";
    }
    
    return Promise.reject(error);
  }
);

export const searchLocation = async (query) => {
  const response = await api.get('/api/search', { params: { q: query } });
  return response.data;
};

export const getLocationDetails = async (lat, lng) => {
  const response = await api.get('/api/location', { params: { lat, lng } });
  return response.data;
};

export default {
  searchLocation,
  getLocationDetails,
};
