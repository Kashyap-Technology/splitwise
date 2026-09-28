import axios from "axios";

const apiUrl = import.meta.env.VITE_API_URL;

if (!apiUrl) {
  // Without a base URL every request falls back to a relative path and is served
  // by Vite instead of the API, which fails much later and much less clearly.
  throw new Error(
    "VITE_API_URL is not set. Add it to frontend/.env.local (or the Vercel project " +
      "settings) as https://<api-host>/api. Note the VITE_ prefix — Vite only " +
      "exposes prefixed variables to the client bundle."
  );
}

export const api = axios.create({
  baseURL: apiUrl.replace(/\/+$/, ""),
  withCredentials: true,
  // Render free instances sleep after inactivity and the first request pays the
  // cold start, so fail with a real error instead of hanging forever.
  timeout: 60_000,
});
