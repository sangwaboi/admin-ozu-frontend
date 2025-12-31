import { supabase } from './supabase';
import { cache, CacheKeys, CacheTTL } from './cache';

const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || "https://ozu-source-code.onrender.com/api";

/**
 * Get the current Supabase session token
 */
async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/**
 * Authenticated API GET request
 */
export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAuthToken();
  
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      "Accept": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

/**
 * Authenticated API request (any method)
 */
export async function authenticatedFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getAuthToken();
  
  if (!token) {
    throw new Error('No authentication token available. Please login.');
  }
  
  return fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
}

export function getBaseUrl() {
  return BASE_URL;
}

// Riders endpoints (adjust to your FastAPI routes if needed)
export const RidersAPI = {
  listLive: async (): Promise<import("../types/rider").Rider[]> => {
    const cacheKey = CacheKeys.RIDERS_LIVE;
    const cached = cache.get(cacheKey);
    if (cached) return cached as import("../types/rider").Rider[];
    
    const data = await apiGet<import("../types/rider").Rider[]>("/riders/live");
    cache.set(cacheKey, data, CacheTTL.RIDERS);
    return data;
  },
  
  // Rider Approval endpoints
  getPending: async () => {
    const cacheKey = CacheKeys.RIDERS_PENDING;
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    
    const response = await authenticatedFetch('/riders/pending');
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const data = await response.json();
    cache.set(cacheKey, data, CacheTTL.RIDERS);
    return data;
  },
  
  getApproved: async () => {
    const cacheKey = CacheKeys.RIDERS_APPROVED;
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    
    const response = await authenticatedFetch('/riders/approved');
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const data = await response.json();
    cache.set(cacheKey, data, CacheTTL.RIDERS);
    return data;
  },
  
  approve: async (riderId: string | number, riderName?: string) => {
    const url = riderName 
      ? `/riders/${riderId}/approve?rider_name=${encodeURIComponent(riderName)}`
      : `/riders/${riderId}/approve`;
    const response = await authenticatedFetch(url, {
      method: 'POST',
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const data = await response.json();
    
    // Invalidate rider caches
    cache.remove(CacheKeys.RIDERS_PENDING);
    cache.remove(CacheKeys.RIDERS_APPROVED);
    cache.remove(CacheKeys.RIDERS_LIVE);
    
    return data;
  },
  
  reject: async (riderId: string | number) => {
    const response = await authenticatedFetch(`/riders/${riderId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const data = await response.json();
    
    // Invalidate rider caches
    cache.remove(CacheKeys.RIDERS_PENDING);
    cache.remove(CacheKeys.RIDERS_APPROVED);
    cache.remove(CacheKeys.RIDERS_LIVE);
    
    return data;
  },
};

// Shipment endpoints with authentication
export const ShipmentAPI = {
  create: async (data: any) => {
    const response = await authenticatedFetch('/shipments/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Invalidate active shipments cache
    cache.clearPattern('shipments_active');
    
    return result;
  },
  
  getResponses: async (shipmentId: string) => {
    const response = await authenticatedFetch(`/shipments/${shipmentId}/responses`);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
  },
  
  getRiderLocation: async (riderId: string) => {
    // Check cache first for instant display
    const cacheKey = CacheKeys.RIDER_LOCATION(riderId);
    const cached = cache.get<{ lat: number; lng: number; updated_at?: string }>(cacheKey);
    if (cached) {
      // Return cached data immediately, but still fetch fresh in background
      setTimeout(() => {
        authenticatedFetch(`/riders/${riderId}/location`)
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data) {
              cache.set(cacheKey, data, CacheTTL.RIDER_LOCATION);
            }
          })
          .catch(() => {}); // Silent fail for background update
      }, 0);
      return cached;
    }
    
    // Fetch fresh data
    const response = await authenticatedFetch(`/riders/${riderId}/location`);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const data = await response.json();
    
    // Cache the result
    cache.set(cacheKey, data, CacheTTL.RIDER_LOCATION);
    return data;
  },
  
  resendNotification: async (shipmentId: number) => {
    const response = await authenticatedFetch(`/shipments/${shipmentId}/resend`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
  },
  
  // Updated to use authenticated endpoints (no mobile parameter needed)
  getActive: async (adminMobile?: string) => {
    const cacheKey = CacheKeys.SHIPMENTS_ACTIVE(adminMobile);
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    
    const response = await authenticatedFetch('/shipments/active');
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const data = await response.json();
    cache.set(cacheKey, data, CacheTTL.SHIPMENTS_ACTIVE);
    return data;
  },
  
  getCompleted: async (adminMobile?: string) => {
    const cacheKey = CacheKeys.SHIPMENTS_COMPLETED(adminMobile);
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    
    const response = await authenticatedFetch('/shipments/completed');
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const data = await response.json();
    cache.set(cacheKey, data, CacheTTL.SHIPMENTS_COMPLETED);
    return data;
  },
};

// Issue tracking endpoints
export const IssuesAPI = {
  // Get all pending issues (not resolved)
  getPending: async () => {
    const response = await authenticatedFetch('/shipments/issues/pending');
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
  },
  
  // Get all issues (including resolved)
  getAll: async () => {
    const response = await authenticatedFetch('/shipments/issues/all');
    if (!response.ok) {
      // Fallback to pending if /all endpoint doesn't exist
      if (response.status === 404) {
        console.warn('Using /pending endpoint as fallback');
        return IssuesAPI.getPending();
      }
      throw new Error(`${response.status} ${response.statusText}`);
    }
    return response.json();
  },
  
  respond: async (issueId: number, data: { action: 'redeliver' | 'return_to_shop', message: string }) => {
    const response = await authenticatedFetch(`/shipments/issues/${issueId}/respond`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `${response.status} ${response.statusText}`);
    }
    
    return response.json();
  },
  
  // Get issues for a specific shipment
  getByShipmentId: async (shipmentId: string | number) => {
    const cacheKey = CacheKeys.ISSUES_BY_SHIPMENT(shipmentId);
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    
    const response = await authenticatedFetch(`/shipments/${shipmentId}/issues`);
    if (!response.ok) {
      if (response.status === 404) {
        const emptyResult = { issues: [] };
        cache.set(cacheKey, emptyResult, CacheTTL.ISSUES);
        return emptyResult; // No issues found
      }
      throw new Error(`${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    cache.set(cacheKey, data, CacheTTL.ISSUES);
    return data;
  },
};

// Tenant endpoints
export const TenantAPI = {
  // Get tenant info for current admin
  getMyTenant: async () => {
    const response = await authenticatedFetch('/admin/tenant');
    if (!response.ok) {
      if (response.status === 404) {
        return null; // Tenant not found
      }
      throw new Error(`${response.status} ${response.statusText}`);
    }
    return response.json();
  },
  
  // Create a new tenant (called during admin signup)
  create: async (name: string, joinCode: string) => {
    const response = await authenticatedFetch('/tenants', {
      method: 'POST',
      body: JSON.stringify({
        name,
        join_code: joinCode,
        is_active: true,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `${response.status} ${response.statusText}`);
    }
    
    return response.json();
  },
};

