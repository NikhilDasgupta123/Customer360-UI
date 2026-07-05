import { getCustomerGraphSession } from '../../auth/logic/authService.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

async function postAiAnalysis(path) {
  const token = getCustomerGraphSession()?.accessToken;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.detail || data?.message || 'AI analysis could not be completed.');
  }

  return data;
}

/**
 * One dashboard API, focused by a small section value. The UI never sends
 * customer records or LLM prompts: the backend reads authorised graph data.
 */
export function analyseDashboardWidget(section) {
  return postAiAnalysis(`/api/v1/ai/analyse-dashboard?section=${encodeURIComponent(section)}`);
}

/**
 * Runs an individual customer analysis for the selected customer.
 */
export function analyseCustomer(customerId) {
  return postAiAnalysis(`/api/v1/ai/customers/${encodeURIComponent(customerId)}/analyse`);
}
