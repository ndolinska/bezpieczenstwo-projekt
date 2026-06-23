import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { login, logout, getUser, completeLogin, rolesOf } from '../auth';
import { api } from '../api';
import { EMPTY_BOOK, EMPTY_USER } from '../constants';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [books, setBooks] = useState([]);
  const [loans, setLoans] = useState([]);
  const [allLoans, setAllLoans] = useState([]);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [filters, setFilters] = useState({ q: '', author: '' });
  const [appliedFilters, setAppliedFilters] = useState({ q: '', author: '' });
  const [newBook, setNewBook] = useState(EMPTY_BOOK);
  const [editingBook, setEditingBook] = useState(null);
  const [newUser, setNewUser] = useState(EMPTY_USER);
  const [authReady, setAuthReady] = useState(false);
  const callbackHandled = useRef(false);

  const roles = useMemo(() => rolesOf(user), [user]);
  const isLibrarian = roles.includes('librarian') || roles.includes('admin');
  const isAdmin = roles.includes('admin');

  useEffect(() => {
    (async () => {
      try {
        if (window.location.pathname === '/callback') {
          if (!callbackHandled.current) {
            callbackHandled.current = true;
            await completeLogin();
          }
          window.history.replaceState({}, '', '/');
        }
        setUser(await getUser());
      } catch (e) {
        setError(e.message);
      } finally {
        setAuthReady(true);
      }
    })();
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;

    const activeFilters = Object.fromEntries(
      Object.entries(appliedFilters).filter(([, v]) => v.trim()),
    );

    setBooks(await api.listBooks(activeFilters));
    setLoans(await api.myLoans());

    if (isLibrarian) {
      setAllLoans(await api.listLoans());
      setStats(await api.stats());
    } else {
      setAllLoans([]);
      setStats(null);
    }

    if (isAdmin) {
      setUsers(await api.listUsers());
    } else {
      setUsers([]);
    }

    setError(null);
  }, [user, appliedFilters, isLibrarian, isAdmin]);

  useEffect(() => {
    if (authReady && user) {
      loadData().catch((e) => setError(e.message));
    }
  }, [authReady, user, loadData]);

  const flash = useCallback((message) => {
    setInfo(message);
    setError(null);
  }, []);

  const run = useCallback(async (action) => {
    setInfo(null);
    await action();
    await loadData();
  }, [loadData]);

  const runSafe = useCallback(async (action, successMessage) => {
    try {
      await run(action);
      if (successMessage) flash(successMessage);
    } catch (e) {
      setError(e.message);
    }
  }, [run, flash]);

  const applyFilters = useCallback(() => {
    setAppliedFilters({ ...filters });
  }, [filters]);

  const clearFilters = useCallback(() => {
    const empty = { q: '', author: '' };
    setFilters(empty);
    setAppliedFilters(empty);
  }, []);

  const value = {
    user,
    roles,
    isLibrarian,
    isAdmin,
    authReady,
    books,
    loans,
    allLoans,
    stats,
    users,
    error,
    info,
    filters,
    setFilters,
    applyFilters,
    newBook,
    setNewBook,
    editingBook,
    setEditingBook,
    newUser,
    setNewUser,
    login,
    logout,
    loadData,
    run,
    runSafe,
    flash,
    clearFilters,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp musi być użyty wewnątrz AppProvider');
  return ctx;
}
