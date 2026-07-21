import type { UserDTO } from "@shared/api";

/**
 * Typed access to the cached session.
 *
 * `JSON.parse(localStorage.getItem("user"))` is the pattern this replaces, and
 * it has two failure modes: `getItem` returns `null` when the key is absent,
 * and the stored value can be malformed if a previous version wrote a
 * different shape. Both surface as a crash at the first property access
 * rather than where the problem is.
 */
export const getStoredUser = (): UserDTO | null => {
  const raw = localStorage.getItem("user");
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    // Guard against a stale or hand-edited entry.
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

/** Clears the session. Used on logout and on an unrecoverable 401. */
export const clearSession = (): void => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};
