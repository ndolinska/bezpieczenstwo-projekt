const express = require('express');
const { ISSUER, JWKS_URI } = require('./auth');

const app = express();
const PORT = process.env.PORT;

const CORS_ORIGINS = (process.env.CORS_ORIGINS)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// SPA (inny origin) wysyła Authorization => wymagany preflight OPTIONS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && CORS_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});


app.use(express.json());

// Endpoint publiczny - kontrola stanu (bez tokenu)
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Trasy chronione (walidacja JWT wewnątrz każdego routera)
app.use('/api/books', require('./routes/books'));
app.use('/api/loans', require('./routes/loans'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/admin', require('./routes/admin')); // zarządzanie userami (proxy do Keycloak Admin API)
// /api/external/google-books -> Google Books (OAuth2)
app.use('/api/external', require('./routes/external')); // Google Books API (OAuth2 / proxy)


// Globalna obsługa błędów (m.in. błędy z Keycloak Admin API)
app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  res.status(err.status || 500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`Resource Server na porcie ${PORT}`);
  console.log(`Issuer:    ${ISSUER}`);
  console.log(`JWKS URI:  ${JWKS_URI}`);
});
