// lib/apiFetch.js
// Thin fetch wrapper that auto-injects Authorization and x-company-id headers.
// Use this instead of raw fetch() for all API calls in the dashboard.

import useAuthStore from "@/store/useAuthStore";

export function apiFetch(url, options = {}) {
  const { token, activeCompanyId } = useAuthStore.getState();

  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(activeCompanyId ? { "x-company-id": activeCompanyId } : {}),
  };

  return fetch(url, { ...options, headers });
}
