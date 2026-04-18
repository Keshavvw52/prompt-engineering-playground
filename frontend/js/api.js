// api.js — all backend communication

function resolveApiBase() {
  const params = new URLSearchParams(window.location.search);
  const override = params.get("apiBase");
  if (override) {
    return override.replace(/\/$/, "");
  }

  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return "http://127.0.0.1:8000/api";
  }

  return "https://prompt-engineering-playground.onrender.com/api";
}

const API_BASE = resolveApiBase();

async function apiFetch(path, options = {}) {
  try {
    const res = await fetch(API_BASE + path, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Request failed');
    }

    return res.json();
  } catch (error) {
    console.error("API Error:", error.message);
    throw error;
  }
}

const API = {
  health: () => apiFetch('/health'),

  generate: (payload) =>
    apiFetch('/generate', { method: 'POST', body: JSON.stringify(payload) }),

  compare: (payload) =>
    apiFetch('/compare', { method: 'POST', body: JSON.stringify(payload) }),

  sweep: (payload) =>
    apiFetch('/sweep', { method: 'POST', body: JSON.stringify(payload) }),

  getPrompts: () => apiFetch('/prompts'),

  savePrompt: (payload) =>
    apiFetch('/prompts', { method: 'POST', body: JSON.stringify(payload) }),

  updatePrompt: (id, payload) =>
    apiFetch(`/prompts/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  deletePrompt: (id) =>
    apiFetch(`/prompts/${id}`, { method: 'DELETE' }),

  getHistory: (limit = 100) =>
    apiFetch(`/history?limit=${limit}`),

  deleteHistoryEntry: (id) =>
    apiFetch(`/history/${id}`, { method: 'DELETE' }),
};
