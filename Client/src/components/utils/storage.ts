import type { UserDTO } from "@shared/api";

export const getStoredUser = (): UserDTO | null => {
  const raw = localStorage.getItem("user");
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && "_id" in parsed) {
      return parsed as UserDTO;
    }
    return null;
  } catch {
    return null;
  }
};

export const setStoredUser = (user: UserDTO): void => {
  localStorage.setItem("user", JSON.stringify(user));
};

export const getToken = (): string | null => localStorage.getItem("token");

export const setToken = (token: string): void => {
  localStorage.setItem("token", token);
};

export const clearSession = (): void => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};
