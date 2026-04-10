const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Public URL used for third-party callbacks/webhooks (e.g., GitHub Webhooks).
// Keep API on localhost for local app calls, but set this to your tunnel/domain.
export const WEBHOOK_BASE_URL = import.meta.env.VITE_WEBHOOK_BASE_URL || API;

export default API;
