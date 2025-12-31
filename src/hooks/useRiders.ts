import { useCallback, useEffect, useRef, useState } from "react";
import type { Rider } from "../types/rider";
import { RidersAPI } from "../lib/api";
import { getRidersSocket } from "../lib/socket";

export function useRiders(pollMs = 5000) {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await RidersAPI.listLive();
      setRiders(data);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      console.error("useRiders.refresh error", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    refresh();
    pollRef.current = window.setInterval(refresh, pollMs);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [refresh, pollMs]);

  // Live socket updates (optional but recommended)
  useEffect(() => {
    const s = getRidersSocket();
    const onUpdate = (payload: Rider) => {
      setRiders((prev) => {
        const idx = prev.findIndex((r) => r.id === payload.id);
        if (idx === -1) return [...prev, payload];
        const next = prev.slice();
        next[idx] = { ...next[idx], ...payload };
        return next;
      });
      setLastUpdated(new Date().toISOString());
    };

    s.on("rider_update", onUpdate);
    s.on("connect_error", (e: any) => console.warn("WS connect error", e?.message));
    return () => {
      s.off("rider_update", onUpdate);
    };
  }, []);

  return { riders, loading, lastUpdated, refresh };
}

