# Biblioteka — system OAuth2

Wielomodułowy system biblioteczny: **Keycloak** (Authorization Server), **Resource Server** (API chronione JWT), trzy klienty OAuth2 (SPA, SSR, B2B) oraz integracja **Google Books API**.

## Wymagania

- Docker Engine + Compose
- Porty: `8080`, `4000`, `5173`, `3031`, `8025` (oraz wewnętrznie Postgres/Mailpit)

## Szybki start

```bash
cp .env.example .env
# Uzupełnij wymagane sekrety (wartości zgodne z keycloak/realm-export.json)
docker compose up -d --build
```

Pierwszy start Keycloak może trwać **1–3 minuty**. Realm `biblioteka` importuje się automatycznie.

### Adresy usług

| Usługa | URL |
|--------|-----|
| Keycloak | http://localhost:8080 |
| Resource Server | http://localhost:4000/health |
| SPA (React) | http://localhost:5173 |
| SSR (Express) | http://localhost:3031 |
| Mailpit (dev) | http://localhost:8025 |

> **SSR:** mapowanie portu `3031:3001` (Windows często blokuje `3001`). Logowanie i callback muszą używać **3031**.

## Konfiguracja `.env`

Wymagane zmienne (compose **nie** podstawia domyślnych sekretów):

| Zmienna | Opis |
|---------|------|
| `POSTGRES_PASSWORD` | Hasło bazy Keycloak |
| `KC_ADMIN_PASSWORD` | Hasło admina panelu Keycloak |
| `SSR_CLIENT_SECRET` | Secret klienta `ssr-client` |
| `B2B_CLIENT_SECRET` | Secret klienta `b2b-client` |
| `RS_ADMIN_CLIENT_SECRET` | Secret service account `rs-admin` |
| `SESSION_SECRET` | Podpis sesji SSR |

Opcjonalnie — Google Books (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`). Bez nich endpoint `/api/external/google-books` zwraca 503.

Sekrety muszą być **zgodne** z `keycloak/realm-export.json`.

## Konta testowe

| Login | Role |
|-------|------|
| `admin_bib` | admin, librarian, reader (+ 2FA TOTP przy logowaniu) |
| `bibliotekarz` | librarian, reader |
| `czytelnik` | reader |

## Moduły

| Moduł | Flow OAuth2 | Dostęp do API |
|-------|-------------|----------------|
| `spa-client` | Authorization Code + **PKCE** (public) | Pełne API + admin + Google Books |
| `ssr-client` | Authorization Code (confidential) | `GET /api/books`, `GET /api/loans/me` |
| `b2b-worker` | **Client Credentials** | `GET /api/stats` → raporty JSON |
| `rs-admin` | Client Credentials (wewnętrzny) | Keycloak Admin API (zarządzanie userami) |

## Role w API

| Rola | Uprawnienia (skrót) |
|------|---------------------|
| `reader` | Katalog, własne wypożyczenia |
| `librarian` | + CRUD książek, statystyki, Google Books, wszystkie wypożyczenia |
| `admin` | + usuwanie książek, panel użytkowników (Keycloak) |

## Google Books (opcjonalnie)

1. Projekt w [Google Cloud Console](https://console.cloud.google.com/), włącz **Google Books API**.
2. OAuth 2.0 Client ID + refresh token (np. [OAuth Playground](https://developers.google.com/oauthplayground/), scope `https://www.googleapis.com/auth/books`).
3. Uzupełnij `GOOGLE_*` w `.env`, zrestartuj `resource-server`.
4. W SPA: bibliotekarz → **Import z Google Books**.

Token Google jest uzyskiwany **po stronie Resource Servera** — sekrety nie trafiają do przeglądarki.

## Reset hasła (dev)

Keycloak wysyła maile przez **Mailpit** (`smtpServer` w realm). Po resecie sprawdź skrzynkę: http://localhost:8025

- Samoobsługa: link „Zapomniałem hasła” na ekranie logowania SPA
- Admin: przycisk **Reset hasła** w panelu użytkowników

## Struktura repozytorium

```
projekt/
├── docker-compose.yml
├── .env.example
├── keycloak/realm-export.json
├── resource-server/     # API, JWT, proxy Google, Keycloak Admin
├── spa-client/          # React + Vite
├── ssr-client/          # Express + EJS
└── b2b-worker/          # Worker + raporty w reports/
```

## Co warto przetestować?

- [ ] SPA — logowanie PKCE, wypożyczenie, zwrot
- [ ] Bibliotekarz — edycja/dodanie książki, statystyki
- [ ] Google Books — import (jeśli skonfigurowane)
- [ ] Admin — CRUD userów, reset hasła, 2FA
- [ ] `admin_bib` — logowanie z TOTP
- [ ] Mailpit — mail z linkiem resetu
- [ ] SSR — http://localhost:3031
- [ ] B2B — pliki w `b2b-worker/reports/`
