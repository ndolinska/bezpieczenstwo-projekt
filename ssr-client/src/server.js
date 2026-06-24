const express = require('express');
const session = require('express-session');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT;

// Konfiguracja OAuth2 (confidential client - Authorization Code).
// Issuer wewnątrz sieci dockerowej to http://keycloak:8080, ale
// przeglądarka musi trafić na http://localhost:8080 - stąd dwa adresy.

const cfg = {
  // adres widoczny dla przeglądarki (redirecty użytkownika)
  authBase: process.env.OIDC_PUBLIC_BASE,
  // adres widoczny z kontenera (wymiana kodu na token server-to-server)
  tokenBase: process.env.OIDC_INTERNAL_BASE,
  clientId: process.env.OIDC_CLIENT_ID,
  clientSecret: process.env.OIDC_CLIENT_SECRET,
  redirectUri: process.env.REDIRECT_URI,
  apiBase: process.env.API_BASE,
};

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: false }, // secure:true za HTTPS
}));

const requireAuth = (req, res, next) =>
  req.session.tokens ? next() : res.redirect('/login');

// Strona startowa
app.get('/', (req, res) => {
  res.render('index', { user: req.session.userinfo || null });
});

// 1. Start logowania - przekierowanie do Keycloak (Authorization Code)
app.get('/login', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.state = state;
  const url = `${cfg.authBase}/protocol/openid-connect/auth?` +
    `response_type=code&client_id=${encodeURIComponent(cfg.clientId)}` +
    `&redirect_uri=${encodeURIComponent(cfg.redirectUri)}` +
    `&scope=${encodeURIComponent('openid profile email')}` +
    `&state=${state}`;
  res.redirect(url);
});

// 2. Callback - wymiana kodu na token (server-to-server, z client_secret)
app.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code || state !== req.session.state) {
    return res.status(400).render('error', { message: 'Nieprawidłowy state lub brak kodu' });
  }
  try {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: cfg.redirectUri,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
    });
    const { data } = await axios.post(
      `${cfg.tokenBase}/protocol/openid-connect/token`,
      body.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    req.session.tokens = data;
    // dekodowanie payloadu id_tokenu tylko do wyświetlenia nazwy użytkownika
   const decodeJwtPayload = (token) =>
      JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    const idPayload = decodeJwtPayload(data.id_token);
    const accessPayload = decodeJwtPayload(data.access_token);
    // Role są w access_token (jak w SPA); id_token służy głównie do tożsamości
    req.session.userinfo = {
      username: idPayload.preferred_username,
      roles: accessPayload.realm_access?.roles || [],
    };
    res.redirect('/books');
  } catch (err) {
    console.error('[ssr] Błąd wymiany kodu:', err.response?.data || err.message);
    res.status(500).render('error', { message: 'Nie udało się uzyskać tokenu' });
  }
});

// Wybrany endpoint API #1: katalog książek
app.get('/books', requireAuth, async (req, res) => {
  try {
    const { data } = await axios.get(`${cfg.apiBase}/api/books`, {
      headers: { Authorization: `Bearer ${req.session.tokens.access_token}` },
    });
    res.render('books', { books: data, user: req.session.userinfo });
  } catch (err) {
    res.status(502).render('error', { message: 'Błąd pobierania katalogu z API' });
  }
});

// Wybrany endpoint API #2: moje wypożyczenia
app.get('/my-loans', requireAuth, async (req, res) => {
  try {
    const { data } = await axios.get(`${cfg.apiBase}/api/loans/me`, {
      headers: { Authorization: `Bearer ${req.session.tokens.access_token}` },
    });
    res.render('loans', { loans: data, user: req.session.userinfo });
  } catch (err) {
    res.status(502).render('error', { message: 'Błąd pobierania wypożyczeń z API' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

app.listen(PORT, () => console.log(`Klient SSR na porcie ${PORT}`));
