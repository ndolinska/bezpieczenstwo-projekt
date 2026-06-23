const express = require('express');
const { authenticate, requireRole } = require('../auth');
const kcAdmin = require('../kcAdmin');

const router = express.Router();

// Cały moduł zarządzania userami dostępny tylko dla roli admin
router.use(authenticate, requireRole('admin'));

function mapUser(u) {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    enabled: u.enabled,
    roles: u.roles || [],
  };
}

// GET /api/admin/users - lista użytkowników (z rolami)
router.get('/users', async (req, res, next) => {
  try {
    const users = await kcAdmin.listUsers();
    res.json(users.map(mapUser));
  } catch (e) { next(e); }
});

// POST /api/admin/users - załóż usera i przypisz rolę
router.post('/users', async (req, res, next) => {
  try {
    const { username, email, firstName, lastName, password, role } = req.body || {};
    if (!username || !role) {
      return res.status(400).json({ error: 'Wymagane: username, role' });
    }
    if (!kcAdmin.APP_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Nieprawidłowa rola' });
    }
    const user = await kcAdmin.createUserWithRole({ username, email, firstName, lastName, password, role });
    res.status(201).json({ id: user.id, username: user.username, role });
  } catch (e) { next(e); }
});

// PATCH /api/admin/users/:id - edycja profilu (email, imię, nazwisko, enabled)
router.patch('/users/:id', async (req, res, next) => {
  try {
    const { email, firstName, lastName, enabled } = req.body || {};
    const user = await kcAdmin.updateUser(req.params.id, { email, firstName, lastName, enabled });
    res.json(mapUser(user));
  } catch (e) { next(e); }
});

// PUT /api/admin/users/:id/role - zmiana roli realmu
router.put('/users/:id/role', async (req, res, next) => {
  try {
    const { role } = req.body || {};
    if (!role || !kcAdmin.APP_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Wymagane: role (admin | librarian | reader)' });
    }
    const user = await kcAdmin.setUserRole(req.params.id, role);
    res.json(mapUser(user));
  } catch (e) { next(e); }
});

// POST /api/admin/users/:id/reset-password - wymuszenie zmiany hasła przy logowaniu
router.post('/users/:id/reset-password', async (req, res, next) => {
  try {
    await kcAdmin.resetPassword(req.params.id);
    res.json({
      ok: true,
      message: 'Użytkownik musi ustawić nowe hasło przy następnym logowaniu (akcja UPDATE_PASSWORD)',
    });
  } catch (e) { next(e); }
});

// POST /api/admin/users/:id/2fa - inicjacja 2FA (CONFIGURE_TOTP)
router.post('/users/:id/2fa', async (req, res, next) => {
  try {
    await kcAdmin.enable2FA(req.params.id);
    res.json({ ok: true, message: 'Wymuszono konfigurację 2FA przy następnym logowaniu' });
  } catch (e) { next(e); }
});

// DELETE /api/admin/users/:id - usunięcie usera
router.delete('/users/:id', async (req, res, next) => {
  try {
    await kcAdmin.deleteUser(req.params.id);
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
