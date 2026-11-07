# Eatable

Monorepo aplikacji mobilnej cross-platform (iOS i Android) oraz API.

## Stack

- **Mobile:** React Native z Expo i TypeScript
- **API:** Fastify i TypeScript (Node.js)
- **Logowanie:** Better Auth — e-mail/hasło i Google OAuth
- **Wspólny kod:** typy kontraktów API w `packages/shared`
- **Workspace:** npm workspaces + Turborepo
- **Lokalnie w kontenerach:** Docker Compose + PostgreSQL

## Wymagania

- Node.js `>=26` (see `.nvmrc`)
- npm (included with Node.js)
- Expo Go na telefonie lub symulator iOS / emulator Android

## Start lokalny bez Dockera

```sh
npm install
npm run dev
```

Turborepo uruchomi API i Expo równolegle. API nasłuchuje na `http://localhost:3000`, a kontrola zdrowia jest dostępna pod `/health`. Expo pokaże QR kod i adres do otwarcia aplikacji.

Run only one service with `npm run dev:api` or `npm run dev:mobile`.

## Start z Dockerem

Uruchom API, dwie niezależne bazy PostgreSQL (aplikacji i Open Food Facts) oraz serwer Expo:

```sh
docker compose up --build
```

The API is available at `http://localhost:3000`, Expo/Metro at port `8081`, the application database at `localhost:5432`, and the Open Food Facts database at `localhost:5433`. Expo/Metro watches the repository mounted as a volume and refreshes the app when files in `apps/mobile` change. Database data is stored separately in the `postgres_data` and `openfoodfacts_data` volumes. The local databases use the development credentials documented in `compose.yaml`.

Przy pierwszym uruchomieniu API tworzy wymagane tabele uwierzytelniania. Rejestracja i logowanie e-mailem działają od razu. Hasła muszą mieć co najmniej 8 znaków; sesje mobilne są przechowywane w systemowym SecureStore.

After signing in, the app loads the daily plan from `GET /api/meals?date=YYYY-MM-DD` and defaults to the local current date. Meal categories belong to each user; new users get breakfast, second breakfast, lunch, afternoon snack, and dinner. Each category supports dated product entries with optional quantity, notes, and nutrition details.

### Bruno API collection

Open `bruno/eatable` in Bruno and select the `local` environment. Set `sessionCookie` in a private Bruno environment or local override; keep session cookies out of checked-in files. The collection includes daily meals, meal entry, profile, and private product catalog requests, including adding a saved product to a meal.

### Google OAuth

1. Skopiuj `.env.example` do `.env` i ustaw `BETTER_AUTH_SECRET` na losową wartość (`openssl rand -base64 32`).
2. W Google Cloud utwórz OAuth Client ID typu Web application. Dla telefonu ustaw `BETTER_AUTH_URL` na publiczny adres HTTPS (np. tunel developerski), dodaj jego origin i ścieżkę `/api/auth/callback/google` jako dozwolone URI przekierowania.
3. W `.env` ustaw `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` oraz `EXPO_PUBLIC_GOOGLE_SIGN_IN_ENABLED=true`.
4. Zrestartuj usługi: `docker compose up --build -d`.

Google SSO on iOS and Android requires a native development build because Expo Go does not support a custom OAuth redirect scheme. After installing dependencies, run `npm exec --workspace=@eatable/mobile -- expo run:ios` or `npm exec --workspace=@eatable/mobile -- expo run:android`. On a physical phone, set the API address to one reachable from the device. Use a public HTTPS address (such as a development tunnel) for the Google callback, and set the same address in `BETTER_AUTH_URL` and the Google redirect URI.

Start only the database if you prefer to run the API on the host with `npm run dev:api`:

```sh
docker compose up -d db open-food-facts-db
DATABASE_URL=postgres://eatable:eatable@localhost:5432/eatable OPEN_FOOD_FACTS_DATABASE_URL=postgres://open_food_facts:open_food_facts@localhost:5433/open_food_facts npm run dev:api
```

Zatrzymanie kontenerów: `docker compose down`. Aby usunąć również lokalne dane bazy: `docker compose down -v`.

## Repository structure

```text
apps/
  api/       Application API and provider orchestration
  mobile/    Expo app for iOS, Android, and web
services/
  product-open-food-facts/  Independent provider module, database schema, and migrations
packages/
  shared/    Shared types and contracts
```

## Test deployment on a VPS

The test deployment runs the API, separate application and Open Food Facts PostgreSQL databases, and the Expo web export in Docker on the Mikrus VPS. Both databases have no published host port and are reachable only on the private Compose network. GitHub Actions builds immutable API and web images for each commit pushed to `staging`, publishes them to GHCR, uploads the Compose configuration, and updates the test stack over SSH. The API is published on Mikrus port `20133` at `https://srv58-20133.wykr.es`; the web app is published on port `30133` at `https://srv58-30133.wykr.es`. Mikrus's proxy provides HTTPS for both hostnames. The production environment is intentionally not configured yet.

### One-time VPS setup

1. Check that Docker Engine and the Docker Compose plugin work on the Mikrus VPS. Mikrus documents Docker installation and requires using its assigned application ports. This setup uses SSH host `srv58.mikr.us`, SSH port `10133`, and application ports `20133` and `30133`.
2. Add an SSH public key for root through the Mikrus panel. Add its private key as the GitHub Environment secret `VPS_SSH_PRIVATE_KEY`. Add the verified SSH host key for `[srv58.mikr.us]:10133` as `VPS_KNOWN_HOSTS`.
3. Create `/opt/eatable-test`, copy `.env.test.example` there as `.env`, and set owner-only permissions (`chmod 600 /opt/eatable-test/.env`). Replace both database password placeholders and the auth secret. Use long random alphanumeric database passwords so they can safely appear in their connection URLs; generate `BETTER_AUTH_SECRET` with `openssl rand -base64 32`.
4. Keep `IMAGE_NAME` as `ghcr.io/tpodkowski/eatable-api` and `WEB_IMAGE_NAME` as `ghcr.io/tpodkowski/eatable-web`. `BETTER_AUTH_URL` is `https://srv58-20133.wykr.es`; `CLIENT_ORIGINS` must include `https://srv58-30133.wykr.es` for browser sign-in and API requests.
5. Create a GitHub Actions environment named `test` and configure these environment secrets: `VPS_SSH_PRIVATE_KEY`, `VPS_KNOWN_HOSTS`, `GHCR_USERNAME`, and `GHCR_READ_TOKEN`. The read token needs permission to pull the package from GHCR. The workflow connects as `root@srv58.mikr.us` on port `10133`.
6. Push to `staging`, or run the `Deploy test API` workflow manually. Verify `https://srv58-20133.wykr.es/health` and open `https://srv58-30133.wykr.es`. Inspect service logs with `docker compose -f /opt/eatable-test/compose.test.yaml logs -f api web`.

The API image runs Better Auth's schema migration and initializes both application and provider schemas on startup. The startup migration also moves any existing Open Food Facts rows from the old application database table into the separate provider database. Schema initialization does not upgrade other existing application tables. Reset an older test database before deploying a schema change that requires new columns or types. Data lives in the `postgres_test_data` and `postgres_open_food_facts_test_data` Docker volumes. Back up both off-server before destructive operations; removing either volume deletes that database. For a quick manual restart, run `cd /opt/eatable-test && docker compose -f compose.test.yaml up -d`.

### GitHub Actions secrets

Secrets belong to the `test` GitHub Environment, not repository files. `VPS_KNOWN_HOSTS` should contain the verified SSH host key line for `[srv58.mikr.us]:10133`. `GHCR_READ_TOKEN` is used only to log the VPS into GHCR during deployment; the workflow uses its short-lived `GITHUB_TOKEN` to publish images.
