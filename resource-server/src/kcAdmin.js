// Klient Keycloak Admin REST API.
// Uwierzytelnianie: Client Credentials dedykowanego service accountu
// (client rs-admin z rolami realm-management). Token cache'owany do exp.
const axios = require('axios');

const REALM = process.env.KC_REALM;
const KC_BASE = process.env.KC_BASE;
const CLIENT_ID = process.env.KC_ADMIN_CLIENT_ID;
const CLIENT_SECRET = process.env.KC_ADMIN_CLIENT_SECRET;

const ADMIN_API = `${KC_BASE}/admin/realms/${REALM}`;
const TOKEN_URL = `${KC_BASE}/realms/${REALM}/protocol/openid-connect/token`;

let cached = { token: null, exp: 0 };

async function getAdminToken() {
  if (cached.token && Date.now() < cached.exp - 5000) return cached.token;

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });

  try {
    const { data } = await axios.post(TOKEN_URL, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    cached = { token: data.access_token, exp: Date.now() + data.expires_in * 1000 };
    return cached.token;
  } catch (err) {
    const status = err.response?.status || 'unknown';
    throw new Error(`Keycloak token error: ${status}`);
  }
}

async function kc(method, path, body) {
  const token = await getAdminToken();

  try {
    const res = await axios({
      method,
      url: `${ADMIN_API}${path}`,
      headers: { Authorization: `Bearer ${token}` },
      ...(body !== undefined ? { data: body } : {}),
    });

    const ct = res.headers['content-type'] || '';
    return ct.includes('application/json') ? res.data : null;
  } catch (err) {
    const status = err.response?.status || 'unknown';
    const detail = err.response?.data
      ? (typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data))
      : err.message;
    const apiErr = new Error(`Keycloak Admin API ${status}: ${detail}`);
    apiErr.status = err.response?.status;
    throw apiErr;
  }
}

const APP_ROLES = ['admin', 'librarian', 'reader'];

// Operacje wykorzystywane przez routes/admin.js 

async function listUsers() {
  const users = await kc('GET', '/users');
  return Promise.all(users.map(async (u) => ({
    ...u,
    roles: await getUserRealmRoleNames(u.id),
  })));
}

async function getUser(id) {
  const user = await kc('GET', `/users/${id}`);
  return { ...user, roles: await getUserRealmRoleNames(id) };
}

async function getUserRealmRoleNames(userId) {
  const roles = await kc('GET', `/users/${userId}/role-mappings/realm`);
  return roles
    .map((r) => r.name)
    .filter((name) => APP_ROLES.includes(name));
}

async function deleteUser(id) {
  return kc('DELETE', `/users/${id}`);
}

async function updateUser(id, { email, firstName, lastName, enabled }) {
  const patch = {};
  if (email !== undefined) patch.email = email;
  if (firstName !== undefined) patch.firstName = firstName;
  if (lastName !== undefined) patch.lastName = lastName;
  if (enabled !== undefined) patch.enabled = enabled;
  if (!Object.keys(patch).length) return getUser(id);
  await kc('PUT', `/users/${id}`, patch);
  return getUser(id);
}

async function setUserRole(userId, role) {
  const current = await kc('GET', `/users/${userId}/role-mappings/realm`);
  const toRemove = current.filter((r) => APP_ROLES.includes(r.name));
  if (toRemove.length) {
    await kc('DELETE', `/users/${userId}/role-mappings/realm`, toRemove);
  }
  const roleDef = await kc('GET', `/roles/${encodeURIComponent(role)}`);
  await kc('POST', `/users/${userId}/role-mappings/realm`, [
    { id: roleDef.id, name: roleDef.name },
  ]);
  return getUser(userId);
}

// Wymusza zmianę hasła przy następnym logowaniu (bez SMTP — demo / dev)
// Wysyła e-mail z linkiem do ustawienia nowego hasła (Keycloak SMTP + execute-actions-email)
async function resetPassword(userId, options = {}) {
  const user = await kc('GET', `/users/${userId}`);
  if (!user.email) {
    const err = new Error('Użytkownik nie ma adresu e-mail — nie można wysłać linku resetu');
    err.status = 400;
    throw err;
  }

  const clientId = options.clientId || process.env.KC_SPA_CLIENT_ID || 'spa-client';
  const lifespan = options.lifespan ?? 43200;
  const qs = new URLSearchParams({
    client_id: clientId,
    lifespan: String(lifespan),
  });

  await kc('PUT', `/users/${userId}/execute-actions-email?${qs}`, ['UPDATE_PASSWORD']);
}

// Tworzy usera, ustawia hasło tymczasowe i przypisuje rolę realmu
async function createUserWithRole({ username, email, firstName, lastName, password, role }) {
  await kc('POST', '/users', {
    username,
    email,
    firstName,
    lastName,
    enabled: true,
    emailVerified: false,
    credentials: password
      ? [{ type: 'password', value: password, temporary: true }]
      : undefined,
    requiredActions: password ? ['UPDATE_PASSWORD'] : [],
  });

  const [user] = await kc('GET', `/users?username=${encodeURIComponent(username)}&exact=true`);
  if (!user) throw new Error('Nie udało się odnaleźć utworzonego użytkownika');

  if (role) {
    const roleDef = await kc('GET', `/roles/${encodeURIComponent(role)}`);
    await kc('POST', `/users/${user.id}/role-mappings/realm`, [
      { id: roleDef.id, name: roleDef.name },
    ]);
  }
  return user;
}

// Dodaje wymaganą akcję CONFIGURE_TOTP (inicjacja 2FA dla usera)
async function enable2FA(userId) {
  return kc('PUT', `/users/${userId}`, { requiredActions: ['CONFIGURE_TOTP'] });
}

module.exports = {
  listUsers,
  getUser,
  deleteUser,
  createUserWithRole,
  updateUser,
  setUserRole,
  resetPassword,
  enable2FA,
  APP_ROLES,
};
