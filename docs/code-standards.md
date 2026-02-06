# ABG Alumni Connect - Code Standards

## Overview

This document establishes coding conventions, testing standards, and architectural patterns used throughout the ABG Alumni Connect project.

## TypeScript & Code Style

### File Organization
- **Naming**: Use kebab-case for filenames (e.g., `member-onboarding-form.tsx`)
- **Size Limit**: Keep individual files under 200 lines when possible
  - Split large components into smaller, focused pieces
  - Extract utility functions into separate modules
  - Use composition over inheritance
- **Imports**: Organize imports as (1) external libs, (2) local imports, (3) types

### TypeScript Conventions
- Use `interface` for public APIs, `type` for internal logic
- All props interfaces end with `Props` suffix
- Always annotate return types on functions
- Use strict null checking (`strict: true` in tsconfig)

### React Components
- Functional components only (no class components)
- Use hooks for state management (useState, useContext, etc.)
- Memoize expensive computations with `useMemo`
- Validate props with Zod schemas at API boundaries

### API Routes
- All request validation uses Zod schemas
- All responses follow standard format: `{ data?, error?, message? }`
- Use try-catch blocks with typed error handling
- Log errors to console with context (route, method, status)

## Testing Standards

### E2E Testing with Playwright

#### Test Structure
Tests are located in `/e2e` directory organized by feature:

```
e2e/tests/
├── auth/              # Authentication flows
├── onboarding/        # Signup and bio generation
├── matching/          # Connection matching requests
├── admin/             # Admin dashboard operations
├── user-flows/        # Complete user journeys
└── edge-cases/        # Error handling and boundaries
```

#### Test Naming Convention
- File: `{feature}.spec.ts` (e.g., `google-oauth.spec.ts`)
- Test case: `test('should {expected behavior}', ...)` (describes outcome, not steps)

#### Page Object Model (POM)
Every page has a corresponding Page Object class:

```typescript
// Example: LoginPage
export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly submitButton: Locator;

  async login(email: string) {
    await this.emailInput.fill(email);
    await this.submitButton.click();
    await this.waitForLoad();
  }
}
```

**Benefits:**
- Centralized selectors (easy UI refactoring)
- Readable test code that follows business logic
- Reusable methods across multiple tests
- BasePage provides common utilities (navigate, waitForLoad, expectToastMessage)

#### Fixtures & Test Data

**Pre-built Fixtures:**

```typescript
// Authenticated page with member session
test('should view profile', async ({ authenticatedPage }) => {
  const { page, member } = authenticatedPage;
  await page.goto('/profile');
  // member is logged-in TestMember with approved status
});

// Admin page with admin session
test('should approve member', async ({ adminPage }) => {
  const { page, admin } = adminPage;
  // admin has isAdmin: true and premium tier
});
```

**Test Data Factories:**

```typescript
// Create member with overrides
const member = createTestMember({
  status: 'pending',
  tier: 'premium',
});

// Create pending member
const pending = createPendingMember();

// Create admin
const admin = createTestAdmin();
```

#### Mock Strategy for External APIs

**Master Mock Registration:**

```typescript
// In test file or setup
await setupAllMocks(page, {
  members: [testMember1, testMember2],
  resend: { captureEmails: true },
});
```

**Mocked Services:**

| Service | Methods | Purpose |
|---------|---------|---------|
| **Google Sheets** | getMember, createMember, updateMember | Member CRUD and approval workflow |
| **Gemini AI** | generateMatches, generateBio | Matching logic and bio generation |
| **Resend** | captureEmails | Email delivery (returns sent emails) |
| **Discord** | interceptWebhooks | Notification webhooks |
| **Vercel Blob** | mockUpload, mockDownload | Avatar/voice file storage |

**Example: Test Email Capture**

```typescript
test('should send confirmation email', async ({ authenticatedPage }) => {
  await setupTestEnvironment(page, [member]);

  // Perform action that sends email
  await page.goto('/onboard');
  await onboardPage.submitForm();

  // Verify email was sent
  const emails = await captureEmails(page);
  expect(emails).toHaveLength(1);
  expect(emails[0].to).toBe(member.email);
});
```

#### Common Test Patterns

**Authentication Flow:**
```typescript
// Use provided fixture
test('should sign in with email', async ({ authenticatedPage }) => {
  const { page, member } = authenticatedPage;
  await page.goto('/profile');
  await expect(page).toHaveURL('/profile');
});
```

**Admin Operations:**
```typescript
test('should approve pending member', async ({ adminPage }) => {
  const { page, admin } = adminPage;
  await setupAllMocks(page, {
    members: [pendingMember]
  });

  await page.goto('/admin');
  await adminPage.approveMember(pendingMember.id);
  await expect(page.locator('text=Approved')).toBeVisible();
});
```

**Tier Restrictions:**
```typescript
test('should prevent basic tier from making multiple requests', async ({ authenticatedPage }) => {
  const basicMember = createTestMember({ tier: 'basic' });
  await setupAllMocks(page, { members: [basicMember] });

  // First request succeeds
  await requestPage.submitRequest('Looking for mentor');
  await expect(page.locator('text=Match results')).toBeVisible();

  // Second request fails
  await page.goto('/request');
  await requestPage.submitRequest('Another request');
  await expect(page.locator('text=Request limit')).toBeVisible();
});
```

#### Running Tests

**Development:**
```bash
npm run test:e2e:ui        # Interactive mode (best for debugging)
npm run test:e2e:headed    # See the browser while tests run
npm run test:e2e:debug     # Step through with Inspector
```

**CI/CD:**
```bash
npm run test:e2e           # Headless (default)
npm run test:e2e:ci        # With CI=true env var
```

**Specific Tests:**
```bash
npx playwright test e2e/tests/auth/      # Run auth tests only
npx playwright test -g "oauth"            # Run tests matching pattern
```

**View Reports:**
```bash
npm run test:e2e:report    # Open HTML report
```

#### Test Configuration

**playwright.config.ts:**
- **Base URL**: `http://127.0.0.1:3000` (configurable via `BASE_URL` env)
- **Timeout**: 30 seconds per test
- **Retries**: 2 in CI, 0 locally
- **Workers**: 1 in CI (sequential), unlimited locally (parallel)
- **Traces**: Recorded on first retry for debugging
- **Screenshots**: Only on failure
- **Videos**: Only in CI on first retry

**Project Setup:**
```typescript
projects: [
  { name: 'chromium', ... },
  { name: 'firefox', ... },
  { name: 'webkit', ... },
]
```

Tests run against all 3 browsers in CI.

## API Design Guidelines

### Request/Response Format

**Standard Response Structure:**
```typescript
interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}
```

**Example Success Response:**
```json
{
  "data": {
    "id": "member-123",
    "email": "user@example.com",
    "status": "approved"
  }
}
```

**Example Error Response:**
```json
{
  "error": "INVALID_EMAIL",
  "message": "Email is required and must be valid"
}
```

### Validation with Zod

All API endpoints validate input with Zod schemas:

```typescript
const SignupSchema = z.object({
  email: z.string().email('Invalid email'),
  name: z.string().min(1, 'Name required'),
  role: z.string().min(1, 'Role required'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, role } = SignupSchema.parse(body);

    // Process request...

    return Response.json({ data: { id } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({
        error: 'VALIDATION_ERROR',
        message: error.errors[0].message,
      }, { status: 400 });
    }

    return Response.json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to process request',
    }, { status: 500 });
  }
}
```

### Authentication & Authorization

**Session Checking:**
```typescript
import { auth } from '@/lib/auth';

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  if (!session.user.isAdmin) {
    return Response.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  // Proceed with admin operation...
}
```

## Database (Google Sheets) Patterns

### CRUD Operations

All database operations use `lib/google-sheets.ts`:

```typescript
import {
  getMember,
  createMember,
  updateMember,
  getAllMembers
} from '@/lib/google-sheets';

// Read
const member = await getMember('member-123');

// Create
const newMember = await createMember({
  email: 'user@example.com',
  name: 'John Doe',
  // ... other fields
});

// Update (only provided fields)
await updateMember('member-123', {
  approval_status: 'approved',
});

// List
const allMembers = await getAllMembers();
```

### Data Types

All data structures are TypeScript interfaces (see `types/index.ts`):

```typescript
interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  company: string;
  expertise: string;
  can_help_with: string;
  looking_for: string;
  bio: string;

  paid: boolean;                    // true = premium
  free_requests_used: number;
  requests_today: number;

  approval_status: 'pending' | 'approved' | 'rejected';
  account_status: 'active' | 'suspended' | 'banned';
  is_csv_imported?: boolean;

  [key: string]: any;               // Additional fields from Sheets
}
```

## Error Handling

### API Errors

Use consistent error codes (UPPERCASE_SNAKE_CASE):

```typescript
// Validation errors
error: 'INVALID_EMAIL'
error: 'VALIDATION_ERROR'
error: 'MISSING_FIELD'

// Auth errors
error: 'UNAUTHORIZED'
error: 'FORBIDDEN'
error: 'ACCOUNT_PENDING'
error: 'ACCOUNT_REJECTED'
error: 'ACCOUNT_SUSPENDED'

// Business logic errors
error: 'TIER_LIMIT_EXCEEDED'
error: 'REQUEST_LIMIT_EXCEEDED'
error: 'DUPLICATE_EMAIL'
error: 'MEMBER_NOT_FOUND'

// Service errors
error: 'EXTERNAL_API_ERROR'
error: 'DATABASE_ERROR'
error: 'INTERNAL_ERROR'
```

### Try-Catch Pattern

```typescript
export async function POST(request: Request) {
  try {
    // Validation
    const body = ValidationSchema.parse(await request.json());

    // Business logic
    const result = await processRequest(body);

    // Success response
    return Response.json({ data: result });

  } catch (error) {
    // Typed error handling
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error);
      return Response.json({
        error: 'VALIDATION_ERROR',
        message: error.errors[0].message,
      }, { status: 400 });
    }

    if (error instanceof NotFoundError) {
      return Response.json({
        error: 'MEMBER_NOT_FOUND',
        message: error.message,
      }, { status: 404 });
    }

    // Generic error
    console.error('Unexpected error:', error);
    return Response.json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to process request',
    }, { status: 500 });
  }
}
```

## Security Standards

### Secrets Management
- **Never** hardcode API keys or secrets in code
- Store all secrets in `.env.local` (local) or Vercel Environment Variables (production)
- Service account keys stored as multi-line strings with proper escaping
- `.env.local` added to `.gitignore` (enforced)

### Authentication
- NextAuth v4 with JWT session strategy
- Magic link emails require verification via Resend
- All OAuth flows validate email before creating session
- Admin checks performed on every protected route

### Rate Limiting
- `/api/auth/check-email`: 10 requests/minute per IP
- `/api/search/public`: 5 requests/minute per IP
- Implemented via middleware, not bypass-able from client

### Account Security
- Approval workflow prevents unauthorized access
- Account suspension available for abuse
- Last login tracked for monitoring
- Audit trail via Discord webhooks

## Component Patterns

### Form Handling with react-hook-form

All forms use react-hook-form with Zod validation:

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  // ... other fields
});

export function MyForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: z.infer<typeof schema>) {
    const response = await fetch('/api/endpoint', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    // Handle response...
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}
    </form>
  );
}
```

### UI Components with Tailwind

- Use `clsx` or `cn()` helper for conditional classes
- No inline styles (use Tailwind utilities)
- Dark mode support via `dark:` prefix
- Responsive design with `sm:`, `md:`, `lg:`, etc.

## Version Control & Commits

### Commit Message Format (Conventional Commits)

```
type(scope): subject

body (optional)

footer (optional)
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Examples:**
```
feat(auth): add magic link authentication
fix(admin): correct tier upgrade logic
docs(e2e): add testing guide
test(matching): add tier limit validation tests
```

### Pre-Commit Checks
- Run linting: `npm run lint`
- Run tests: `npm run test:e2e` (in CI)
- No unresolved conflicts

### Branching Strategy
- `main`: Production-ready code
- Feature branches: `feat/{description}` or `fix/{description}`
- Create PR with meaningful description and test results

## Performance Guidelines

### Code Optimization
- Memoize expensive calculations with `useMemo`
- Use `useCallback` for event handlers passed as props
- Lazy load components with `React.lazy()` and `Suspense`
- Avoid unnecessary re-renders

### API Performance
- Batch Sheets API calls when possible (minimize round trips)
- Cache member profiles in context/state
- Rate limiting on public endpoints
- Compress large data transfers

### Bundle Size
- Monitor bundle size with `next/bundle-analyzer`
- Dynamic imports for heavy libraries
- Remove unused dependencies regularly

## Documentation

### Code Comments
- Comment "why", not "what" (code shows what it does)
- Mark complex algorithms or business logic
- Include examples for non-obvious APIs

### README & Docs
- Keep `/docs` directory up-to-date with code changes
- Update API documentation when endpoints change
- Add troubleshooting guides for common issues
- Document breaking changes with migration paths
