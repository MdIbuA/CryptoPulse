import axios from "axios";

const baseURL = "/api";

export const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const forecastApi = {
  getHistory: () => api.get("/forecast/history"),
  clearHistory: () => api.delete("/forecast/history"),
};

// Dashboard related helpers
export const computeMi = (coin, options = {}) => api.post(`/dashboard/metadata/${coin}/compute_mi`, options);

