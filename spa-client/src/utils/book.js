export function normalizeBook(book) {
  return {
    ...book,
    year: Number(book.year) || undefined,
    copies: Number(book.copies) || 1,
  };
}
