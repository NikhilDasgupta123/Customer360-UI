const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

function getApiBaseUrl() {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL;
  return (configuredUrl || DEFAULT_API_BASE_URL).replace(/\/$/, '');
}

async function readApiResponse(response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return { detail: text || response.statusText };
}

async function postJson(path, body) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await readApiResponse(response);

  if (!response.ok) {
    const message =
      typeof data?.detail === 'string'
        ? data.detail
        : Array.isArray(data?.detail)
          ? data.detail.map((item) => item.msg || item.message || JSON.stringify(item)).join(', ')
          : data?.message || 'Request failed. Please try again.';

    throw new Error(message);
  }

  return data;
}

export function saveAuthSession(authResponse) {
  if (!authResponse?.tokens?.access_token) return;

  localStorage.setItem('cg_access_token', authResponse.tokens.access_token);
  localStorage.setItem('cg_refresh_token', authResponse.tokens.refresh_token);
  localStorage.setItem('cg_user', JSON.stringify(authResponse.user));
}

export function clearAuthSession() {
  localStorage.removeItem('cg_access_token');
  localStorage.removeItem('cg_refresh_token');
  localStorage.removeItem('cg_user');
}

export async function loginCustomerGraph({ email, password }) {
  const result = await postJson('/auth/login', {
    email: email.trim(),
    password,
  });

  saveAuthSession(result);
  return result;
}

const UI_ROLE_TO_API_ROLE = {
  'sales-executive': 'sales_executive',
  'account-manager': 'account_manager',
  'support-agent': 'support_agent',
  'customer-success-manager': 'customer_success_manager',
};

function normalizeRoleForApi(roleId) {
  return UI_ROLE_TO_API_ROLE[roleId] || String(roleId || '').replaceAll('-', '_');
}

export async function requestCustomerGraphAccess({
  fullName,
  email,
  password,
  confirmPassword,
  roleId,
  team,
}) {
  return postJson('/auth/request-access', {
    full_name: fullName.trim(),
    email: email.trim(),
    password,
    confirm_password: confirmPassword,
    company_team: team.trim() || null,
    role: normalizeRoleForApi(roleId),
  });
}
