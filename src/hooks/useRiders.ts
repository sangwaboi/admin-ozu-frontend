import { useCallback, useEffect, useRef, useState } from "react";
import type { Rider } from "../types/rider";
import { RidersAPI } from "../lib/api";
import { cache, CacheKeys } from "../lib/cache";
import { getRidersSocket } from "../lib/socket";

export function useRiders(pollMs = 5000) {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const refresh = useCallback(async (useCache = false) => {
    // Load cached data immediately if available
    if (useCache) {
      const cached = cache.get<Rider[]>(CacheKeys.RIDERS_LIVE);
      if (cached && cached.length > 0) {
        setRiders(cached);
        setLastUpdated(new Date().toISOString());
        setLoading(false);
      }
    }

    setLoading(true);
    try {
      // API will use cache if available, otherwise fetch fresh
      const data = await RidersAPI.listLive();
      setRiders(data || []);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      console.error("useRiders.refresh error", err);
      setRiders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    // Load cached data immediately, then refresh
    refresh(true);
    pollRef.current = window.setInterval(() => refresh(false), pollMs);
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

