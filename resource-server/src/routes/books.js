const express = require('express');
const { authenticate, requireRole } = require('../auth');
const store = require('../store');

const router = express.Router();

// Wszystkie endpointy książek wymagają zalogowania
router.use(authenticate);

// GET /api/books - lista z filtrami (?q=, ?author=, ?category=) - reader+
router.get('/', requireRole('reader', 'librarian', 'admin'), (req, res) => {
  const { q, author, category } = req.query;
  let result = store.books;
  if (q) result = result.filter((b) => b.title.toLowerCase().includes(q.toLowerCase()));
  if (author) result = result.filter((b) => b.author.toLowerCase().includes(author.toLowerCase()));
  if (category) result = result.filter((b) => b.category === category);
  res.json(result);
});

// GET /api/books/:id - reader+
router.get('/:id', requireRole('reader', 'librarian', 'admin'), (req, res) => {
  const book = store.books.find((b) => b.id === Number(req.params.id));
  if (!book) return res.status(404).json({ error: 'Nie znaleziono książki' });
  res.json(book);
});

// POST /api/books - dodanie - librarian+
router.post('/', requireRole('librarian', 'admin'), (req, res) => {
  const { isbn, title, author, year, category, copies } = req.body || {};
  if (!title || !author) return res.status(400).json({ error: 'Wymagane: title, author' });
  const book = { id: store.nextBookId(), isbn, title, author, year, category, copies: copies ?? 1 };
  store.books.push(book);
  res.status(201).json(book);
});

// PUT /api/books/:id - edycja - librarian+
router.put('/:id', requireRole('librarian', 'admin'), (req, res) => {
  const book = store.books.find((b) => b.id === Number(req.params.id));
  if (!book) return res.status(404).json({ error: 'Nie znaleziono książki' });
  Object.assign(book, req.body);
  res.json(book);
});

// DELETE /api/books/:id - tylko admin
router.delete('/:id', requireRole('admin'), (req, res) => {
  const idx = store.books.findIndex((b) => b.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Nie znaleziono książki' });
  store.books.splice(idx, 1);
  res.status(204).end();
});

module.exports = router;
