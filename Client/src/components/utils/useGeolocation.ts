import { useState, useCallback } from "react";
import type { Coords } from "@shared/api";

export type GeolocationStatus = "idle" | "locating" | "ready" | "error";

export interface UseGeolocation {
  coords: Coords | null;
  status: GeolocationStatus;
  error: string | null;
  request: () => void;
  clear: () => void;
}

/**
 * Wraps the browser geolocation API in something a component can use directly.
 *
 * Deliberately not automatic on mount: requesting location unprompted triggers
 * a permission dialog before the user knows why it's being asked for, which is
 * both hostile and a reliable way to get permanently denied.
 */
export const useGeolocation = (): UseGeolocation => {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<GeolocationStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("error");
      setError("Your browser doesn't support location access.");
      return;
    }

    setStatus("locating");
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus("ready");
      },
      (err) => {
        const messages: Record<number, string> = {
          1: "Location permission denied. You can still search by sport.",
          2: "Your location is unavailable right now.",
          3: "Timed out while finding your location.",
        };
        setError(messages[err.code] ?? "Couldn't determine your location.");
        setStatus("error");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  const clear = useCallback(() => {
    setCoords(null);
    setStatus("idle");
    setError(null);
  }, []);

  return { coords, status, error, request, clear };
};

/** Renders a metre distance the way a person would say it. */
export const formatDistance = (metres: number | undefined | null): string => {
  if (metres === undefined || metres === null) return "";
  if (metres < 1000) return `${Math.round(metres / 50) * 50} m away`;
  if (metres < 10000) return `${(metres / 1000).toFixed(1)} km away`;
  return `${Math.round(metres / 1000)} km away`;
};
