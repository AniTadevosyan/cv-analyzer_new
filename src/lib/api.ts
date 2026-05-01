const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export const authStore = {
  get token() {
    return localStorage.getItem("cv_token");
  },
  set(token: string, user: unknown) {
    localStorage.setItem("cv_token", token);
    localStorage.setItem("cv_user", JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem("cv_token");
    localStorage.removeItem("cv_user");
  },
  get user() {
    const raw = localStorage.getItem("cv_user");
    return raw ? JSON.parse(raw) : null;
  },
};

async function parseResponse(response: Response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.detail || "Something went wrong");
  }
  return data;
}

export async function apiPost(path: string, body: unknown, authorized = false) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authorized && authStore.token) headers.Authorization = `Bearer ${authStore.token}`;

  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return parseResponse(response);
}

export async function apiGet(path: string, authorized = false) {
  const headers: Record<string, string> = {};
  if (authorized && authStore.token) headers.Authorization = `Bearer ${authStore.token}`;
  const response = await fetch(`${API_URL}${path}`, { headers });
  return parseResponse(response);
}

export async function apiDelete(path: string, authorized = false) {
  const headers: Record<string, string> = {};
  if (authorized && authStore.token) headers.Authorization = `Bearer ${authStore.token}`;
  const response = await fetch(`${API_URL}${path}`, { method: "DELETE", headers });
  if (response.status === 204) return null;
  return parseResponse(response);
}

export async function analyzeCVs(formData: FormData) {
  const headers: Record<string, string> = {};
  if (authStore.token) headers.Authorization = `Bearer ${authStore.token}`;

  const response = await fetch(`${API_URL}/api/analyze`, {
    method: "POST",
    headers,
    body: formData,
  });
  return parseResponse(response);
}

export async function getAnalyses() {
  return apiGet("/api/analyses", true);
}

export async function sendCandidateEmail(candidateId: number, recipientEmail: string) {
  return apiPost(`/api/candidates/${candidateId}/send-email`, { recipient_email: recipientEmail }, true);
}
