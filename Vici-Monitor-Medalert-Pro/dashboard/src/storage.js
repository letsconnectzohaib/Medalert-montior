export const LS = {
  gatewayUrl: 'vmp_gatewayUrl',
  token: 'vmp_token',
  user: 'vmp_user',
  page: 'vmp_page'
};

export function loadSession() {
  const gatewayUrl = localStorage.getItem(LS.gatewayUrl) || 'http://localhost:3100';
  const token = localStorage.getItem(LS.token);
  const userRaw = localStorage.getItem(LS.user);
  const page = localStorage.getItem(LS.page) || 'overview';
  let user = null;
  try {
    user = userRaw ? JSON.parse(userRaw) : null;
  } catch {
    user = null;
  }
  return { gatewayUrl, token, user, page };
}

export function saveSession({ gatewayUrl, token, user }) {
  if (gatewayUrl) localStorage.setItem(LS.gatewayUrl, gatewayUrl);
  if (token) localStorage.setItem(LS.token, token);
  if (user) localStorage.setItem(LS.user, JSON.stringify(user));
}

export function savePage(page) {
  if (page) localStorage.setItem(LS.page, page);
}

export function clearSession() {
  localStorage.removeItem(LS.token);
  localStorage.removeItem(LS.user);
}

