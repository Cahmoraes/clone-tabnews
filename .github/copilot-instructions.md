# Clone TabNews - AI Coding Agent Instructions

## Architecture Overview

This is a Next.js-based social platform (clone of tabnews.com.br) with:
- **Pages Router API**: All endpoints in `pages/api/v1/` (not App Router)
- **Absolute imports**: `jsconfig.json` sets `baseUrl: "."` - use `import database from "infra/database"` (not relative paths)
- **Feature-based authorization**: Users have `features[]` array (e.g., `["create:session", "read:session"]`)
- **PostgreSQL + Docker**: Database and MailCatcher run via `infra/compose.yaml`
- **Vitest with single-thread mode**: All tests run sequentially to avoid database conflicts
- **Biome.js**: Linting and formatting (tabs, double quotes, semicolons as needed)

## Critical Patterns

### 1. API Route Structure (next-connect)
```javascript
import { createRouter } from "next-connect";
import { controller } from "infra/controller";

const router = createRouter();
// Only for routes requiring authorization:
router.use(controller.injectAnonymousOrUser);  // Inject user or anonymous
router.post(controller.canRequest("create:session"), postHandler);
export default router.handler(controller.errorHandlers);
```
- **Always** use `controller.errorHandlers` to handle errors consistently
- Use `controller.injectAnonymousOrUser` + `canRequest()` **only for routes requiring authorization**
- Public routes (user creation, migrations, status): No middleware needed
- Sensitive endpoints (user data): Add `Cache-Control: no-store, no-cache, max-age=0, must-revalidate` header

### 2. Authorization System (`models/authorization.js`)
- Users start with `["read:activation_token", "create:session", "create:user"]`
- After activation: `["create:session", "read:session"]`
- Anonymous users get features via `injectAnonymousUser()` in `infra/controller.js`
- Check permissions with: `authorization.can(user, "feature:name")` or `authorization.cannot(user, "feature:name")`

### 3. Test Patterns (`tests/orchestrator.js`)
```javascript
// Standard test setup (with database)
beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

// Create authenticated user for tests
const user = await orchestrator.createUser({ username: "test" });
await orchestrator.activateUser(user);
const session = await orchestrator.createSession(user.id);
// Use session.token in Cookie: `session_id=${session.token}`

// Cookie assertions (use set-cookie-parser)
import setCookieParser from "set-cookie-parser";
const parsedCookies = setCookieParser(response, { map: true });
expect(parsedCookies.session_id.httpOnly).toBe(true);

// Time manipulation for expiration tests
import { vi } from "vitest";
vi.useFakeTimers({ now: new Date(Date.now() - expirationTime) });
// ... test expired session
vi.useRealTimers();

// Minimal test setup (no database needed)
beforeAll(async () => {
  await orchestrator.waitForAllServices();  // Status checks, etc.
});
```

### 4. Error Handling
- Use custom errors from `infra/errors.js`: `ValidationError`, `NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `ServiceError`
- `UnauthorizedError` automatically clears session cookie
- `ServiceError` for database/service failures (500 errors)
- All errors return JSON with: `{name, message, action, status_code}`

### 5. Database & Migrations

**Connection Pool Config (`infra/database.js`)**:
- Max connections: 20
- Idle timeout: 30s
- Connection timeout: 2s

**SQL Query Pattern**:
```javascript
await database.query({
  text: /*sql*/ `SELECT * FROM users WHERE id = $1;`,  // Syntax highlighting
  values: [id]  // Always use parameterized queries
});
```

**Migrations (`infra/migrations/`)**:
- Create: `npm run migrations:create <name>`
- Run: `npm run migrations:up` (uses `.env.development`)
- Migrations use `node-pg-migrate`: `exports.up` and `exports.down`
- **Never** set `exports.down = false` unless migration is irreversible

## Development Workflow

### Running the App
```bash
npm run dev  # Starts services + waits for DB + runs migrations + Next.js dev server
```

### Testing
```bash
npm test              # Runs all tests (stops services after)
npm run test:watch    # Watch mode for development
```
- Tests use `.env.development` automatically (via `tests/setup/config-environment.js`)
- Vitest runs in **single-thread mode** to prevent race conditions
- Each test file should clear database in `beforeAll`

### Database Commands
```bash
npm run services:up              # Start PostgreSQL + MailCatcher
npm run services:wait:database   # Wait for DB to be ready
npm run migrations:up            # Run pending migrations
npm run migrations:down          # Rollback last migration
```

### Code Quality (Biome.js)
```bash
npm run lint:check    # Check linting + formatting (Biome)
npm run lint:fix      # Auto-fix issues (Biome)
npm run commit        # Commitizen for conventional commits
```
- **Biome.js** (not Prettier/ESLint): Tabs, double quotes, semicolons as needed, auto-organize imports
- Husky enforces commitlint (conventional commits)
- Lint-staged auto-formats staged files before commit

## Key Files & Directories

- `infra/controller.js` - Request middleware, session management, authorization
- `infra/webserver.js` - Origin detection (localhost/Vercel preview/production)
- `models/` - Business logic (user, session, activation, authorization, password)
- `models/password.js` - Password hashing (bcrypt rounds: 14 in prod, 1 in dev/test)
- `tests/orchestrator.js` - Test utilities (createUser, activateUser, createSession, email helpers)
- `pages/api/v1/` - API endpoints (Next.js Pages Router)
- `infra/compose.yaml` - Docker services (postgres-dev, mailcatcher-dev)
- `.env.development` - Environment variables (used by tests and dev server)
- `jsconfig.json` - Enables absolute imports from project root

## Environment-Specific Behavior

**Origin Detection (`infra/webserver.js`)**:
- Development/Test: `http://localhost:3000`
- Vercel Preview: `https://${process.env.VERCEL_URL}`
- Production: `https://fintab.com.br`

**Password Hashing (`models/password.js`)**:
- Production: 14 bcrypt rounds (secure but slower)
- Development/Test: 1 round (fast for testing)
- Uses `process.env.NODE_ENV` to determine environment

## Common Gotchas

1. **Session cookies**: Use `controller.setSessionCookie(token, response)` - not manual headers
2. **Test failures**: If tests fail with 401/403, check if user is activated and has correct features
3. **Database errors**: Ensure `orchestrator.clearDatabase()` is called in test `beforeAll`
4. **Anonymous users**: They have `read:activation_token` feature, not authenticated features
5. **Username/email**: Stored and queried case-insensitively (`LOWER()` in SQL)
6. **Migration rollback**: `exports.down = false` means "cannot rollback" - use with caution
7. **Absolute imports**: Use `import from "infra/..."` not `import from "../../../infra/..."`
8. **SQL injection**: Always use parameterized queries (`$1`, `$2`) - never string concatenation

## Email Testing (MailCatcher)

- Access UI: `http://localhost:1080`
- SMTP: `localhost:1025` (via nodemailer)
- Email provider: `infra/email.js` (secure only in production)

**Test Workflow**:
```javascript
await orchestrator.deleteAllEmails();  // Clear before test
// ... trigger email-sending action
const email = await orchestrator.getLastEmail();
const token = orchestrator.extractUUID(email.text);
// ... use token in subsequent requests
```
