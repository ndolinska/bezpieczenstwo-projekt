const { createRemoteJWKSet, jwtVerify } = require('jose');

// Walidacja tokenów OAuth2 / OIDC wystawionych przez Keycloak.
// Klucze publiczne pobierane z endpointu JWKS realmu (cache w jose).

function parseIssuers() {
  const raw = process.env.OIDC_ISSUER;
  if (raw && raw.trim()) {
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }
  // SPA (przeglądarka) vs B2B/SSR (sieć docker) — różne iss w tokenie
  return [
    'http://localhost:8080/realms/biblioteka',
    'http://keycloak:8080/realms/biblioteka',
  ];
}

const ISSUERS = parseIssuers();
const ISSUER = ISSUERS.join(', ');
const JWKS_URI = process.env.OIDC_JWKS_URI;
// Opcjonalnie — Keycloak często nie ma aud w access_token (tylko w id_token)
const AUDIENCE = process.env.OIDC_AUDIENCE?.trim() || null;

const JWKS = createRemoteJWKSet(new URL(JWKS_URI));

// Middleware: weryfikuje podpis, iss, exp; aud tylko gdy OIDC_AUDIENCE ustawione
async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Brak tokenu Bearer' });
  }
  const token = header.slice('Bearer '.length);

  const verifyOptions = {
    issuer: ISSUERS.length === 1 ? ISSUERS[0] : ISSUERS,
  };
  if (AUDIENCE) {
    verifyOptions.audience = AUDIENCE;
  }

  try {
    const { payload } = await jwtVerify(token, JWKS, verifyOptions);
    req.user = {
      sub: payload.sub,
      username: payload.preferred_username,
      email: payload.email,
      roles: payload.realm_access?.roles || [],
    };
    return next();
  } catch (err) {
    console.warn('[auth] Odrzucono token:', err.code || err.message, err.claim || '');
    return res.status(401).json({ error: 'Nieprawidłowy lub wygasły token' });
  }
}

// Middleware fabryka: wymaga przynajmniej jednej z podanych ról
function requireRole(...allowed) {
  return (req, res, next) => {
    const roles = req.user?.roles || [];
    if (roles.some((r) => allowed.includes(r))) {
      return next();
    }
    return res.status(403).json({
      error: 'Brak uprawnień',
      wymagane: allowed,
      posiadane: roles,
    });
  };
}

module.exports = { authenticate, requireRole, ISSUER, JWKS_URI };
