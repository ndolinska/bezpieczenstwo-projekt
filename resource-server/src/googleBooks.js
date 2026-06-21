const axios = require('axios');

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_BOOKS_URL = 'https://www.googleapis.com/books/v1/volumes';
const BOOKS_SCOPE = 'https://www.googleapis.com/auth/books';

let cached = { token: null, exp: 0 };

function isConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID
    && process.env.GOOGLE_CLIENT_SECRET
    && process.env.GOOGLE_REFRESH_TOKEN,
  );
}

async function getGoogleAccessToken() {
  if (!isConfigured()) {
    const err = new Error(
      'Google Books OAuth2 nie jest skonfigurowane. Ustaw GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET i GOOGLE_REFRESH_TOKEN.',
    );
    err.status = 503;
    throw err;
  }

  if (cached.token && Date.now() < cached.exp - 5000) return cached.token;

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  try {
    const { data } = await axios.post(GOOGLE_TOKEN_URL, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    cached = {
      token: data.access_token,
      exp: Date.now() + (data.expires_in || 3600) * 1000,
    };
    return cached.token;
  } catch (err) {
    const detail = err.response?.data?.error_description || err.response?.data?.error || err.message;
    const tokenErr = new Error(`Google OAuth2 token error: ${detail}`);
    tokenErr.status = 502;
    throw tokenErr;
  }
}

function extractIsbn(identifiers = []) {
  const isbn13 = identifiers.find((i) => i.type === 'ISBN_13');
  if (isbn13) return isbn13.identifier;
  const isbn10 = identifiers.find((i) => i.type === 'ISBN_10');
  return isbn10?.identifier || '';
}

function extractYear(publishedDate) {
  if (!publishedDate) return undefined;
  const year = Number.parseInt(String(publishedDate).slice(0, 4), 10);
  return Number.isNaN(year) ? undefined : year;
}

function mapVolume(item) {
  const info = item.volumeInfo || {};
  return {
    googleId: item.id,
    title: info.title || 'Bez tytułu',
    author: (info.authors || []).join(', ') || 'Nieznany autor',
    year: extractYear(info.publishedDate),
    isbn: extractIsbn(info.industryIdentifiers),
    category: (info.categories || [])[0] || '',
    thumbnail: info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || null,
    description: info.description ? String(info.description).slice(0, 240) : null,
  };
}

async function searchVolumes(query, maxResults = 10) {
  const accessToken = await getGoogleAccessToken();

  const params = {
    q: query,
    maxResults: Math.min(Math.max(Number(maxResults) || 10, 1), 20),
    printType: 'books',
  };

  try {
    const { data } = await axios.get(GOOGLE_BOOKS_URL, {
      params,
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return {
      authMode: 'oauth2',
      scope: BOOKS_SCOPE,
      results: (data.items || []).map(mapVolume),
    };
  } catch (err) {
    const status = err.response?.status || 502;
    const detail = err.response?.data?.error?.message || err.message;
    const apiErr = new Error(`Google Books API ${status}: ${detail}`);
    apiErr.status = status === 401 || status === 403 ? 502 : status;
    throw apiErr;
  }
}

module.exports = { searchVolumes, isConfigured };
