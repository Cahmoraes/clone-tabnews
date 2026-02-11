# Clone TabNews - AI Coding Agent Instructions

## Architecture Overview

This is a Next.js-based social platform (clone of tabnews.com.br) with:
- **Pages Router API**: All endpoints in `pages/api/v1/` (not App Router)
- **Feature-based authorization**: Users have `features[]` array (e.g., `["create:session", "read:session"]`)
- **PostgreSQL + Docker**: Database and MailCatcher run via `infra/compose.yaml`
- **Vitest with single-thread mode**: All tests run sequentially to avoid database conflicts

## Critical Patterns

### 1. API Route Structure (next-connect)
```javascript
import { createRouter } from "next-connect";
import { controller } from "infra/controller";

const router = createRouter();
router.use(controller.injectAnonymousOrUser);  // Inject user or anonymous
router.post(controller.canRequest("create:session"), postHandler);
export default router.handler(controller.errorHandlers);
```
- **Always** use `controller.errorHandlers` to handle errors consistently
- **Always** call `controller.injectAnonymousOrUser` before checking permissions
- Use `controller.canRequest(feature)` middleware for authorization checks

### 2. Authorization System (`models/authorization.js`)
- Users start with `["read:activation_token", "create:session", "create:user"]`
- After activation: `["create:session", "read:session"]`
- Anonymous users get features via `injectAnonymousUser()` in `infra/controller.js`
- Check permissions with: `authorization.can(user, "feature:name")`

### 3. Test Patterns (`tests/orchestrator.js`)
```javascript
// Standard test setup
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
```

### 4. Error Handling
- Use custom errors from `infra/errors.js`: `ValidationError`, `NotFoundError`, `UnauthorizedError`, `ForbiddenError`
- `UnauthorizedError` automatically clears session cookie
- All errors return JSON with: `{name, message, action, status_code}`

### 5. Database Migrations (`infra/migrations/`)
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

### Code Quality
```bash
npm run lint:prettier:check   # Check formatting
npm run lint:prettier:fix     # Auto-fix formatting
npm run lint:eslint:check     # Check linting
npm run commit                # Commitizen for conventional commits
```
- Husky enforces commitlint (conventional commits)
- Lint-staged runs prettier + eslint on staged files

## Key Files & Directories

- `infra/controller.js` - Request middleware, session management, authorization
- `models/` - Business logic (user, session, activation, authorization)
- `tests/orchestrator.js` - Test utilities (createUser, activateUser, createSession)
- `pages/api/v1/` - API endpoints (Next.js Pages Router)
- `infra/compose.yaml` - Docker services (postgres-dev, mailcatcher-dev)
- `.env.development` - Environment variables (used by tests and dev server)

## Common Gotchas

1. **Session cookies**: Use `controller.setSessionCookie(token, response)` - not manual headers
2. **Test failures**: If tests fail with 401/403, check if user is activated and has correct features
3. **Database errors**: Ensure `orchestrator.clearDatabase()` is called in test `beforeAll`
4. **Anonymous users**: They have `read:activation_token` feature, not authenticated features
5. **Username/email**: Stored and queried case-insensitively (`LOWER()` in SQL)
6. **Migration rollback**: `exports.down = false` means "cannot rollback" - use with caution

## Email Testing (MailCatcher)

- Access UI: `http://localhost:1080`
- SMTP: `localhost:1025`
- Test helpers: `orchestrator.getLastEmail()`, `orchestrator.deleteAllEmails()`
- Extract tokens: `orchestrator.extractUUID(emailText)` for activation links
