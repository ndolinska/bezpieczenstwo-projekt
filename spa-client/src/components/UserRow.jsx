import { useEffect, useState } from 'react';
import { api } from '../api';
import { APP_ROLES } from '../constants';
import { useApp } from '../context/AppContext';

export default function UserRow({ user }) {
  const { runSafe } = useApp();
  const [role, setRole] = useState(user.roles?.[0] || 'reader');
  const [enabled, setEnabled] = useState(user.enabled);

  useEffect(() => {
    setRole(user.roles?.[0] || 'reader');
    setEnabled(user.enabled);
  }, [user]);

  return (
    <tr>
      <td>{user.username}</td>
      <td>{user.email || '—'}</td>
      <td>
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          {APP_ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <button type="button" onClick={() => runSafe(() => api.setUserRole(user.id, role), 'Zmieniono rolę')}>
          Zapisz rolę
        </button>
      </td>
      <td>
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        <button type="button" onClick={() => runSafe(() => api.updateUser(user.id, { enabled }), 'Zaktualizowano status')}>
          Zapisz
        </button>
      </td>
      <td>
        <button type="button" onClick={() => runSafe(() => api.resetPassword(user.id), 'Wymuszono reset hasła')}>
          Reset hasła
        </button>{' '}
        <button type="button" onClick={() => runSafe(() => api.enable2FA(user.id), 'Wymuszono 2FA')}>
          2FA
        </button>{' '}
        <button
          type="button"
          className="btn-danger"
          onClick={() => {
            if (window.confirm(`Usunąć użytkownika ${user.username}?`)) {
              runSafe(() => api.deleteUser(user.id), 'Usunięto użytkownika');
            }
          }}
        >
          Usuń
        </button>
      </td>
    </tr>
  );
}
