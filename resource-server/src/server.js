const express = require('express');
const { ISSUER, JWKS_URI } = require('./auth');

const app = express();
const PORT = process.env.PORT;

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
