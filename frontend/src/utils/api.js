import axios from "axios";

const api = axios.create({
  baseURL: "/",
  headers: { "Content-Type": "application/json" },
});

// Auto-attach token from localStorage
api.interceptors.request.use((config) => {
  const stored = localStorage.getItem("medscreen_user");
  if (stored) {
    try {
      const user = JSON.parse(stored);
      if (user?.access_token) {
        config.headers.Authorization = `Bearer ${user.access_token}`;
      }
    } catch {}
  }
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem("medscreen_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;
