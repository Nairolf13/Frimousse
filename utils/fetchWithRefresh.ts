declare const importMeta: ImportMeta;
const API_URL = (typeof importMeta !== 'undefined' && importMeta.env && importMeta.env.VITE_API_URL)
  ? importMeta.env.VITE_API_URL
  : (window as { VITE_API_URL?: string }).VITE_API_URL || '';

export async function fetchWithRefresh(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const fetchInit = { ...init, credentials: 'include' as RequestCredentials };
  let res = await fetch(input, fetchInit);
  if (res.status !== 401) return res;

  const refreshRes = await fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!refreshRes.ok) {
    return res;
  }
  res = await fetch(input, fetchInit);
  return res;
}
