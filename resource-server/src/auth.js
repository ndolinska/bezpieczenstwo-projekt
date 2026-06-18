const { createRemoteJWKSet, jwtVerify } = require('jose');

// Walidacja tokenów OAuth2 / OIDC wystawionych przez Keycloak.
// Klucze publiczne pobierane z endpointu JWKS realmu (cache w jose).

const ISSUER = process.env.OIDC_ISSUER;
const JWKS_URI = process.env.OIDC_JWKS_URI;

// Oczekiwane "audience" tokenu (np. account / rs-api - zależnie od konfiguracji mappera)
const AUDIENCE = process.env.OIDC_AUDIENCE;

const JWKS = createRemoteJWKSet(new URL(JWKS_URI));

// Middleware: weryfikuje podpis, iss, aud, exp i odkłada payload w req.user
async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Brak tokenu Bearer' });
  }
  const token = header.slice('Bearer '.length);

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    req.user = {
      sub: payload.sub,
      username: payload.preferred_username,
      email: payload.email,
      roles: payload.realm_access?.roles || [],
    };
    return next();
  } catch (err) {
    console.warn('[auth] Odrzucono token:', err.code || err.message);
    return res.status(401).json({ error: 'Nieprawidłowy lub wygasły token' });
  }
}

// Middleware: wymaga przynajmniej jednej z podanych ról
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
