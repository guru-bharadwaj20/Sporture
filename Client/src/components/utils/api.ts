import axios, { type AxiosResponse } from "axios";
import type {
  AuthResponse,
  Coords,
  CreateEventPayload,
  CreateFeedbackPayload,
  CurrentUserResponse,
  EventDTO,
  EventSearchParams,
  FeedbackDTO,
  LoginPayload,
  PublicUserDTO,
  RecommendationsResponse,
  RegisterPayload,
  UpdateProfilePayload,
  UserDTO,
} from "@shared/api";

export const API_ORIGIN: string =
  import.meta.env.VITE_API_URL ?? "http://localhost:5000";

const api = axios.create({
  baseURL: `${API_ORIGIN}/api`,
});

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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.log("Unauthorized - token invalid or expired");
    }
    return Promise.reject(error);
  }
);

export const registerUser = (
  userData: RegisterPayload
): Promise<AxiosResponse<AuthResponse>> => api.post("/auth/register", userData);

export const loginUser = (
  credentials: LoginPayload
): Promise<AxiosResponse<AuthResponse>> => api.post("/auth/login", credentials);

export const getCurrentUser = (): Promise<AxiosResponse<CurrentUserResponse>> =>
  api.get("/auth/me");

export const getUserById = (id: string): Promise<AxiosResponse<PublicUserDTO>> =>
  api.get(`/users/${id}`);

export const updateUserById = (
  id: string,
  data: UpdateProfilePayload
): Promise<AxiosResponse<UserDTO>> => api.put(`/users/${id}`, data);

export const uploadUserPhoto = (
  id: string,
  file: File
): Promise<AxiosResponse<{ message: string; user: UserDTO }>> => {
  const formData = new FormData();
  formData.append("photo", file);
  return api.post(`/users/${id}/upload-photo`, formData);
};

export const getFeedback = (): Promise<AxiosResponse<FeedbackDTO[]>> =>
  api.get("/feedback");

export const postFeedback = (
  feedbackData: CreateFeedbackPayload
): Promise<AxiosResponse<FeedbackDTO>> => api.post("/feedback", feedbackData);

export const getEvents = (
  params: EventSearchParams = {}
): Promise<AxiosResponse<EventDTO[]>> => api.get("/events", { params });

export const getAllEvents = (): Promise<AxiosResponse<EventDTO[]>> =>
  api.get("/events");

export const getEventById = (id: string): Promise<AxiosResponse<EventDTO>> =>
  api.get(`/events/${id}`);

export const createEvent = (
  eventData: CreateEventPayload
): Promise<AxiosResponse<EventDTO>> => api.post("/events", eventData);

export const getJoinedEvents = (): Promise<AxiosResponse<EventDTO[]>> =>
  api.get("/events/joined");

export const joinEvent = (
  id: string
): Promise<AxiosResponse<{ success: boolean; message: string; event: EventDTO }>> =>
  api.post(`/events/${id}/join`);

export const getRecommendedEvents = (
  { coords, limit = 6 }: { coords?: Coords | null; limit?: number } = {}
): Promise<AxiosResponse<RecommendationsResponse>> =>
  api.get("/events/recommended", {
    params: { limit, ...(coords ? { lat: coords.lat, lng: coords.lng } : {}) },
  });

export default api;
