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

## Test API deployment on a VPS

The test deployment runs the API, PostgreSQL, and Caddy on one VPS. PostgreSQL has no published host port and is reachable only on the private Compose network. GitHub Actions builds an immutable image for each commit pushed to `staging`, publishes it to GHCR, uploads the Compose and Caddy configuration, and updates the test stack over SSH. The production environment is intentionally not configured yet.

### One-time VPS setup

1. Create a VPS with Docker Engine and the Docker Compose plugin. Point a DNS A/AAAA record for the test API hostname at the VPS. Allow inbound SSH, HTTP (80), and HTTPS (443); do not open ports 3000 or 5432.
2. Create a deploy user with Docker access and SSH public-key login. Add the corresponding private key as the GitHub Environment secret `VPS_SSH_PRIVATE_KEY`.
3. Create `/opt/eatable-test`, copy `.env.test.example` there as `.env`, and set owner-only permissions (`chmod 600 /opt/eatable-test/.env`). Replace every placeholder. Use a long random alphanumeric database password so the same value can safely appear in `DATABASE_URL`; generate `BETTER_AUTH_SECRET` with `openssl rand -base64 32`.
4. Set `IMAGE_NAME` to `ghcr.io/<lowercase-github-owner>/eatable-api`. `BETTER_AUTH_URL` and `API_DOMAIN` must use the test hostname. Set `CLIENT_ORIGINS` to the exact allowed client origins, or leave it empty for a native-only test client.
5. Create a GitHub Actions environment named `test` and configure these environment secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_PRIVATE_KEY`, `VPS_KNOWN_HOSTS`, `GHCR_USERNAME`, and `GHCR_READ_TOKEN`. The read token needs permission to pull the package from GHCR. Obtain the known-hosts line from a trusted source when provisioning the server; do not disable SSH host key checking.
6. Push to `staging`, or run the `Deploy test API` workflow manually. The first successful start obtains the HTTPS certificate through Caddy. Verify `https://<test-hostname>/health` and inspect logs with `docker compose -f /opt/eatable-test/compose.test.yaml logs -f api`.

The API image currently runs Better Auth's schema migration and the app migrations on startup. The PostgreSQL data lives in the `postgres_test_data` Docker volume. Back it up off-server before destructive operations; removing the volume deletes the test database. For a quick manual restart, run `cd /opt/eatable-test && docker compose -f compose.test.yaml up -d`.

### GitHub Actions secrets

Secrets belong to the `test` GitHub Environment, not repository files. `VPS_KNOWN_HOSTS` should contain the verified SSH host key line. `GHCR_READ_TOKEN` is used only to log the VPS into GHCR during deployment; the workflow uses its short-lived `GITHUB_TOKEN` to publish images.
