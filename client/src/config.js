const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Public URL for GitHub Webhooks. Fallback to API URL if not explicitly set.
export const WEBHOOK_BASE_URL = import.meta.env.VITE_WEBHOOK_BASE_URL || API;

export default API;
