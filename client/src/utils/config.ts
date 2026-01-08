const isDev = !!import.meta.env.DEV;
export const API_BASE_URL =
  (import.meta.env.VITE_API_URL && String(import.meta.env.VITE_API_URL).trim() !== '')
    ? String(import.meta.env.VITE_API_URL)
    : (isDev ? 'http://localhost:5000' : '');
