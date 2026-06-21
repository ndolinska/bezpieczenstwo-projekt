import axios from 'axios';
import { getUser } from './auth';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use(async (config) => {
  const user = await getUser();
  if (user?.access_token) {
    config.headers.Authorization = `Bearer ${user.access_token}`;
  }
  return config;
});

async function handle(promise) {
  try {
    const res = await promise;
    return res.status === 204 ? null : res.data;
  } catch (err) {
    throw new Error(err.response?.data?.error || err.message);
  }
}

function booksQuery({ q, author, category } = {}) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (author) params.set('author', author);
  if (category) params.set('category', category);
  const qs = params.toString();
  return `/api/books${qs ? `?${qs}` : ''}`;
}

export const api = {
  // książki
  listBooks: (filters) => handle(client.get(booksQuery(filters))),
  getBook: (id) => handle(client.get(`/api/books/${id}`)),
  createBook: (book) => handle(client.post('/api/books', book)),
  updateBook: (id, book) => handle(client.put(`/api/books/${id}`, book)),
  deleteBook: (id) => handle(client.delete(`/api/books/${id}`)),
  // wypożyczenia
  borrow: (bookId) => handle(client.post('/api/loans', { bookId })),
  returnLoan: (id) => handle(client.put(`/api/loans/${id}/return`)),
  myLoans: () => handle(client.get('/api/loans/me')),
  listLoans: (status) => handle(client.get('/api/loans', {
    params: status ? { status } : undefined,
  })),
  // statystyki
  stats: () => handle(client.get('/api/stats')),
  // zarządzanie użytkownikami (proxy Keycloak Admin API)
  listUsers: () => handle(client.get('/api/admin/users')),
  getUser: (id) => handle(client.get(`/api/admin/users/${id}`)),
  createUser: (payload) => handle(client.post('/api/admin/users', payload)),
  updateUser: (id, payload) => handle(client.patch(`/api/admin/users/${id}`, payload)),
  setUserRole: (id, role) => handle(client.put(`/api/admin/users/${id}/role`, { role })),
  resetPassword: (id) => handle(client.post(`/api/admin/users/${id}/reset-password`)),
  enable2FA: (id) => handle(client.post(`/api/admin/users/${id}/2fa`)),
  deleteUser: (id) => handle(client.delete(`/api/admin/users/${id}`)),
  // integracja zewnętrzna — Google Books (proxy Resource Server)
  googleBooks: (q) => handle(client.get('/api/external/google-books', { params: { q } })),
};
