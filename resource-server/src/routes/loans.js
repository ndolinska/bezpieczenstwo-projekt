const express = require('express');
const { authenticate, requireRole } = require('../auth');
const store = require('../store');

const router = express.Router();
router.use(authenticate);

// POST /api/loans - wypożyczenie - reader+
router.post('/', requireRole('reader', 'librarian', 'admin'), (req, res) => {
  const { bookId } = req.body || {};
  const book = store.books.find((b) => b.id === Number(bookId));
  if (!book) return res.status(404).json({ error: 'Nie znaleziono książki' });
  const active = store.loans.filter((l) => l.bookId === book.id && l.status === 'active').length;
  if (active >= book.copies) return res.status(409).json({ error: 'Brak dostępnych egzemplarzy' });

  const loan = {
    id: store.nextLoanId(),
    bookId: book.id,
    userId: req.user.sub,
    borrowedAt: new Date().toISOString(),
    returnedAt: null,
    status: 'active',
  };
  store.loans.push(loan);
  res.status(201).json(loan);
});

// GET /api/loans/me - moje wypożyczenia - reader+ (przed GET /)
router.get('/me', requireRole('reader', 'librarian', 'admin'), (req, res) => {
  res.json(store.loans.filter((l) => l.userId === req.user.sub));
});

// GET /api/loans - wszystkie wypożyczenia - librarian+ (?status=active|returned)
router.get('/', requireRole('librarian', 'admin'), (req, res) => {
  let result = store.loans.map((l) => ({
    ...l,
    bookTitle: store.books.find((b) => b.id === l.bookId)?.title,
  }));
  const { status } = req.query;
  if (status) result = result.filter((l) => l.status === status);
  res.json(result);
});

// PUT /api/loans/:id/return - zwrot - reader+ (własne; librarian/admin dowolne)
router.put('/:id/return', requireRole('reader', 'librarian', 'admin'), (req, res) => {
  const loan = store.loans.find((l) => l.id === Number(req.params.id));
  if (!loan) return res.status(404).json({ error: 'Nie znaleziono wypożyczenia' });
  const isStaff = req.user.roles.includes('admin') || req.user.roles.includes('librarian');
  if (loan.userId !== req.user.sub && !isStaff) {
    return res.status(403).json({ error: 'To nie jest Twoje wypożyczenie' });
  }
  loan.status = 'returned';
  loan.returnedAt = new Date().toISOString();
  res.json(loan);
});

module.exports = router;
