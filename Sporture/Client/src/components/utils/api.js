// Client/src/components/utils/api.js

import axios from "axios";

// Configured per-environment via .env (see .env.example). Falls back to the
// local dev server so a fresh clone works without setup.
export const API_ORIGIN = import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: `${API_ORIGIN}/api`,
});

// Request interceptor - Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle 401 errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If 401 Unauthorized, it means token is invalid/expired
    if (error.response?.status === 401) {
      console.log("❌ Unauthorized - clearing auth data");
      // Don't clear storage here, let the component handle redirect
      // Just pass the error along
    }
    return Promise.reject(error);
  }
);

// ---------- AUTH ----------
export const registerUser = (userData) => api.post("/auth/register", userData);
export const loginUser = (credentials) => api.post("/auth/login", credentials);
export const getCurrentUser = () => api.get("/auth/me");

// ---------- USERS ----------
export const getUserById = (id) => api.get(`/users/${id}`);
export const updateUserById = (id, data) => api.put(`/users/${id}`, data);

// Sends the auth token via the shared interceptor; a bare fetch() would not.
export const uploadUserPhoto = (id, file) => {
  const formData = new FormData();
  formData.append("photo", file);
  return api.post(`/users/${id}/upload-photo`, formData);
};

// ---------- FEEDBACK ----------
export const getFeedback = () => api.get("/feedback");
export const postFeedback = (feedbackData) => api.post("/feedback", feedbackData);

// ---------- EVENTS ----------
export const getAllEvents = () => api.get("/events"); // For dashboard
export const getEvents = () => api.get("/events"); // For discovery page
export const getEventById = (id) => api.get(`/events/${id}`); // For EventDetails page
export const createEvent = (eventData) => api.post("/events", eventData);
export const getJoinedEvents = () => api.get("/events/joined");
export const joinEvent = (id) => api.post(`/events/${id}/join`);

export default api;