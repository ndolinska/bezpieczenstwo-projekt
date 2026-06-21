const express = require('express');
const { authenticate, requireRole } = require('../auth');
const googleBooks = require('../googleBooks');

const router = express.Router();

router.use(authenticate, requireRole('librarian', 'admin'));

// GET /api/external/google-books?q=...&maxResults=10
// Proxy do Google Books API — token Google OAuth2 po stronie Resource Servera.
router.get('/google-books', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) {
      return res.status(400).json({ error: 'Wymagany parametr q (fraza wyszukiwania)' });
    }

    const { authMode, scope, results } = await googleBooks.searchVolumes(
      q,
      req.query.maxResults,
    );

    res.json({
      query: q,
      source: 'google-books',
      authMode,
      scope,
      count: results.length,
      results,
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
