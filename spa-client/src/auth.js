import { UserManager, WebStorageStateStore } from 'oidc-client-ts';

// Konfiguracja OIDC dla public client (Authorization Code + PKCE).
// PKCE jest domyślnie włączone w oidc-client-ts.
// Access token trzymamy w pamięci (in-memory store), NIE w localStorage.
// Tylko dane sesji OIDC (stan logowania) w sessionStorage.

const authority = import.meta.env.VITE_OIDC_AUTHORITY;

export const userManager = new UserManager({
  authority,
  client_id: import.meta.env.VITE_OIDC_CLIENT_ID,
  redirect_uri: import.meta.env.VITE_REDIRECT_URI,
  post_logout_redirect_uri: import.meta.env.VITE_POST_LOGOUT_URI,
  response_type: 'code',
  scope: 'openid profile email',
  // token tylko w pamięci RAM zakładki (bezpieczeństwo - brak persystencji access tokenu)
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
  automaticSilentRenew: true,
});

export const login = () => userManager.signinRedirect();
export const logout = () => userManager.signoutRedirect();
export const completeLogin = () => userManager.signinRedirectCallback();
export const getUser = () => userManager.getUser();

export function rolesOf(user) {
  if (!user?.access_token) return [];
  try {
    const payload = JSON.parse(atob(user.access_token.split('.')[1]));
    return payload.realm_access?.roles || [];
  } catch {
    return [];
  }
}
