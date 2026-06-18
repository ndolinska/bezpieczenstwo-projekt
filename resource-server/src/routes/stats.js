const express = require('express');
const { authenticate, requireRole } = require('../auth');
const store = require('../store');

const router = express.Router();
router.use(authenticate);

// GET /api/stats - statystyki - admin / librarian (używane też przez klienta B2B)
router.get('/', requireRole('admin', 'librarian'), (req, res) => {
  const counts = {};
  for (const loan of store.loans) {
    counts[loan.bookId] = (counts[loan.bookId] || 0) + 1;
  }
  const mostBorrowed = Object.entries(counts)
    .map(([bookId, n]) => ({
      book: store.books.find((b) => b.id === Number(bookId))?.title,
      wypozyczen: n,
    }))
    .sort((a, b) => b.wypozyczen - a.wypozyczen)
    .slice(0, 5);

  res.json({
    ksiazkiWKatalogu: store.books.length,
    aktywneWypozyczenia: store.loans.filter((l) => l.status === 'active').length,
    najczesciejWypozyczane: mostBorrowed,
  });
});

module.exports = router;
