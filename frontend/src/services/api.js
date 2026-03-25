import axios from "axios";

const API = import.meta.env.VITE_API_URL;
console.log("Using API:", API);

const api = axios.create({
  baseURL: API,
  timeout: 45000, // 45s for Render cold starts
});

export const apiService = {
  getInsights: (lat, lng) => api.get(`/api/location`, { params: { lat, lng } }),
  searchLocation: (query) => api.get(`/api/search`, { params: { q: query } }),
  client: api
};

export default apiService;
