import { useCallback, useEffect, useState } from "react";
import type { EventsResponse } from "../types/events";

interface UseEventsResult {
  data: EventsResponse | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export function useEvents(days = 30): UseEventsResult {
  const [data, setData] = useState<EventsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/events?days=${days}`)
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load events (${response.status})`);
        return response.json() as Promise<EventsResponse>;
      })
      .then((payload) => {
        if (!cancelled) {
          setData(payload);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [days, attempt]);

  return { data, loading, error, retry };
}
