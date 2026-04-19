export const API =
  process.env.REACT_APP_API_URL ||
  "https://quiz-backend-9jwm.onrender.com/api";

export const authFetch = async (url, options = {}) => {
  const token = localStorage.getItem("token");

  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
};