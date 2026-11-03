# Eatable

Monorepo aplikacji mobilnej cross-platform (iOS i Android) oraz API.

## Stack

- **Mobile:** React Native z Expo i TypeScript
- **API:** Fastify i TypeScript (Node.js)
- **Logowanie:** Better Auth — e-mail/hasło i Google OAuth
- **Wspólny kod:** typy kontraktów API w `packages/shared`
- **Workspace:** pnpm + Turborepo
- **Lokalnie w kontenerach:** Docker Compose + PostgreSQL

## Wymagania

- Node.js `>=22.13`
- pnpm `10`
- Expo Go na telefonie lub symulator iOS / emulator Android

Jeśli pnpm nie jest zainstalowany: `npm install --global pnpm@10`.

## Start lokalny bez Dockera

```sh
pnpm install
pnpm dev
```

Turborepo uruchomi API i Expo równolegle. API nasłuchuje na `http://localhost:3000`, a kontrola zdrowia jest dostępna pod `/health`. Expo pokaże QR kod i adres do otwarcia aplikacji.

Osobno można uruchomić `pnpm dev:api` lub `pnpm dev:mobile`.

## Start z Dockerem

Uruchom API, PostgreSQL i serwer Expo:

```sh
docker compose up --build
```

API będzie dostępne pod `http://localhost:3000`, Expo/Metro na porcie `8081`, a PostgreSQL pod `localhost:5432`. Expo/Metro obserwuje pliki z repozytorium podmontowane jako wolumen — zapis zmian w `apps/mobile` automatycznie odświeża aplikację. Dane bazy są przechowywane w wolumenie `postgres_data`. Lokalny zestaw używa danych dostępowych `eatable` / `eatable` i bazy `eatable`.

Przy pierwszym uruchomieniu API tworzy wymagane tabele uwierzytelniania. Rejestracja i logowanie e-mailem działają od razu. Hasła muszą mieć co najmniej 8 znaków; sesje mobilne są przechowywane w systemowym SecureStore.

After signing in, the app loads the daily plan from `GET /api/meals?date=YYYY-MM-DD` and defaults to the local current date. Meal categories belong to each user; new users get breakfast, second breakfast, lunch, afternoon snack, and dinner. Each category supports dated product entries with optional quantity, notes, and nutrition details.

### Bruno API collection

Open `bruno/eatable` in Bruno and select the `local` environment. Set `sessionCookie` in a private Bruno environment or local override; keep session cookies out of checked-in files. The collection includes a daily-meals request and a request to create a product entry.

### Google OAuth

1. Skopiuj `.env.example` do `.env` i ustaw `BETTER_AUTH_SECRET` na losową wartość (`openssl rand -base64 32`).
2. W Google Cloud utwórz OAuth Client ID typu Web application. Dla telefonu ustaw `BETTER_AUTH_URL` na publiczny adres HTTPS (np. tunel developerski), dodaj jego origin i ścieżkę `/api/auth/callback/google` jako dozwolone URI przekierowania.
3. W `.env` ustaw `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` oraz `EXPO_PUBLIC_GOOGLE_SIGN_IN_ENABLED=true`.
4. Zrestartuj usługi: `docker compose up --build -d`.

Google SSO na iOS/Android wymaga natywnego development builda, bo Expo Go nie obsługuje własnego schematu przekierowania OAuth. Po instalacji zależności uruchom `pnpm --filter @eatable/mobile exec expo run:ios` albo `pnpm --filter @eatable/mobile exec expo run:android`. Dla fizycznego telefonu adres API ustaw na adres osiągalny z telefonu. Do callbacka Google użyj publicznego adresu HTTPS (np. tunelu developerskiego), a ten sam adres wpisz w `BETTER_AUTH_URL` i w URI przekierowania Google.

Uruchom samą bazę, jeśli wolisz odpalać API na hoście przez `pnpm dev:api`:

```sh
docker compose up -d db
DATABASE_URL=postgres://eatable:eatable@localhost:5432/eatable pnpm dev:api
```

Zatrzymanie kontenerów: `docker compose down`. Aby usunąć również lokalne dane bazy: `docker compose down -v`.

## Struktura

```text
apps/
  api/       Fastify API
  mobile/    aplikacja Expo (iOS, Android, opcjonalnie web)
packages/
  shared/    wspólne typy i kontrakty
```
