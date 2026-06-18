// Tymczasowy magazyn w pamięci (szkielet).
// Docelowo: PostgreSQL (np. przez pg / Prisma / Knex)
let nextBookId = 4;
let nextLoanId = 1;

const books = [
  { id: 1, isbn: '9788375780635', title: 'Wiedźmin: Ostatnie życzenie', author: 'Andrzej Sapkowski', year: 1993, category: 'fantasy', copies: 3 },
  { id: 2, isbn: '9780261103573', title: 'Władca Pierścieni', author: 'J.R.R. Tolkien', year: 1954, category: 'fantasy', copies: 2 },
  { id: 3, isbn: '9788324031320', title: 'Czysty kod', author: 'Robert C. Martin', year: 2008, category: 'IT', copies: 5 },
];

const loans = []; // { id, bookId, userId, borrowedAt, returnedAt, status }

module.exports = {
  books,
  loans,
  nextBookId: () => nextBookId++,
  nextLoanId: () => nextLoanId++,
};
