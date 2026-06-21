import { api } from '../api';
import { APP_ROLES, EMPTY_USER } from '../constants';
import { useApp } from '../context/AppContext';
import UserRow from './UserRow';

export default function AdminPanel() {
  const { users, newUser, setNewUser, runSafe } = useApp();

  const visibleUsers = users.filter((u) => !u.username?.startsWith('service-account-'));

  return (
    <section className="section">
      <h2>Panel administratora — użytkownicy</h2>

      <h3>Nowy użytkownik</h3>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          runSafe(async () => {
            await api.createUser(newUser);
            setNewUser(EMPTY_USER);
          }, 'Utworzono użytkownika');
        }}
      >
        <input
          required
          placeholder="login"
          value={newUser.username}
          onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
        />
        <input
          placeholder="email"
          value={newUser.email}
          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
        />
        <input
          placeholder="imię"
          value={newUser.firstName}
          onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
        />
        <input
          placeholder="nazwisko"
          value={newUser.lastName}
          onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
        />
        <input
          placeholder="hasło tymcz."
          value={newUser.password}
          onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
        />
        <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
          {APP_ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <button type="submit">Utwórz</button>
      </form>

      <table className="data-table">
        <thead>
          <tr>
            <th>Login</th>
            <th>Email</th>
            <th>Rola</th>
            <th>Aktywny</th>
            <th>Akcje</th>
          </tr>
        </thead>
        <tbody>
          {visibleUsers.map((u) => (
            <UserRow key={u.id} user={u} />
          ))}
        </tbody>
      </table>
    </section>
  );
}
