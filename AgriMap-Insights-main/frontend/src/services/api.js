import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

// Add a request interceptor for potential logging or debugging
api.interceptors.request.use(
  (config) => {
    console.log(`[API Request] ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor for global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[API Error]', error.response || error.message);
    
    // Customize error messages based on status codes
    if (!error.response) {
      error.userMessage = 'Connection failed. The server may be waking up, please wait...';
    } else if (error.response.status >= 500) {
      error.userMessage = 'Server-side error. Please try again later.';
    } else if (error.response.data && error.response.data.detail) {
      error.userMessage = error.response.data.detail;
    } else {
      error.userMessage = 'An unexpected error occurred.';
    }
    
    return Promise.reject(error);
  }
);

export const searchLocation = async (query) => {
  const response = await api.get('/api/search', {
    params: { q: query }
  });
  return response.data;
};

export const getLocationDetails = async (lat, lng) => {
  const response = await api.get('/api/location', {
    params: { lat, lng }
  });
  return response.data;
};

export default {
  searchLocation,
  getLocationDetails,
};
