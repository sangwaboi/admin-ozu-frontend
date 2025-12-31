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
  
  if (!res.ok) {
    // Try to get error details
    let errorMessage = `${res.status} ${res.statusText}`;
    try {
      const errorData = await res.json();
      errorMessage = errorData.detail || errorData.message || errorMessage;
    } catch {
      // If response is not JSON, use status text
    }
    throw new Error(errorMessage);
  }
  
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
    if (cached && Array.isArray(cached)) return cached as import("../types/rider").Rider[];
    
    try {
      const data = await apiGet<import("../types/rider").Rider[]>("/riders/live");
      // Ensure response is an array
      const riders = Array.isArray(data) ? data : [];
      cache.set(cacheKey, riders, CacheTTL.RIDERS);
      return riders;
    } catch (error: any) {
      // If CORS or network error, return empty array
      if (error?.message?.includes('CORS') || error?.message?.includes('Failed to fetch')) {
        console.warn('CORS error fetching riders - returning empty array');
        return [];
      }
      throw error;
    }
  },
  
  // Rider Approval endpoints
  getPending: async () => {
    const response = await authenticatedFetch('/riders/pending');
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
  },
  
  getApproved: async () => {
    const response = await authenticatedFetch('/riders/approved');
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
  },
  
  approve: async (riderId: string | number, riderName?: string) => {
    const url = riderName 
      ? `/riders/${riderId}/approve?rider_name=${encodeURIComponent(riderName)}`
      : `/riders/${riderId}/approve`;
    const response = await authenticatedFetch(url, {
      method: 'POST',
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
  },
  
  reject: async (riderId: string | number) => {
    const response = await authenticatedFetch(`/riders/${riderId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
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
    
    return response.json();
  },
  
  getResponses: async (shipmentId: string) => {
    const response = await authenticatedFetch(`/shipments/${shipmentId}/responses`);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
  },
  
  getRiderLocation: async (riderId: string) => {
    const response = await authenticatedFetch(`/riders/${riderId}/location`);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
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
    if (cached && Array.isArray(cached)) return cached;
    
    try {
      // Use adminMobile in query if provided (for backward compatibility)
      const url = adminMobile 
        ? `/shipments/active?adminMobile=${encodeURIComponent(adminMobile)}`
        : '/shipments/active';
      
      const response = await authenticatedFetch(url);
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('403 Forbidden: Authentication failed or insufficient permissions');
        }
        let errorMessage = `${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
          // If response is not JSON, use status text
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      // Ensure response is an array
      const shipments = Array.isArray(data) ? data : [];
      cache.set(cacheKey, shipments, CacheTTL.SHIPMENTS_ACTIVE);
      return shipments;
    } catch (error: any) {
      // If it's a network/CORS error, return empty array instead of breaking
      if (error?.message?.includes('Failed to fetch') || error?.message?.includes('CORS')) {
        console.warn('Network error fetching shipments - returning empty array');
        return [];
      }
      throw error;
    }
  },
  
  getCompleted: async () => {
    const response = await authenticatedFetch('/shipments/completed');
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
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
    const response = await authenticatedFetch(`/shipments/${shipmentId}/issues`);
    if (!response.ok) {
      if (response.status === 404) {
        return { issues: [] }; // No issues found
      }
      throw new Error(`${response.status} ${response.statusText}`);
    }
    return response.json();
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

