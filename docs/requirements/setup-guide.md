# ABG Alumni Connect - Setup & Configuration Guide

This guide will help you obtain all the necessary API keys and configure the environment for the ABG Alumni Connect platform.

## 1. Supabase Configuration

### Step A: Create a Supabase Project
1.  Go to [Supabase](https://supabase.com) and sign in or create an account.
2.  Click **New Project** → Enter project name (e.g., "ABG Connect").
3.  Choose a strong database password.
4.  Select your region (closest to your users).
5.  Click **Create new project** and wait for initialization (2-3 minutes).

### Step B: Get Supabase API Keys
1.  Go to **Project Settings** → **API**.
2.  Under **Project API keys**, you will see:
    *   **URL** → Copy and paste into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL`
    *   **anon (public)** → Copy and paste as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    *   **service_role (secret)** → Copy and paste as `SUPABASE_SERVICE_ROLE_KEY`
3.  Verify all three keys are set in `.env.local`.

### Step C: Deploy Database Migrations
1.  Ensure you have the Supabase CLI installed:
    ```bash
    npm install -g supabase
    ```
2.  Link your local project to Supabase:
    ```bash
    supabase link --project-ref your-project-ref
    ```
3.  Run migrations:
    ```bash
    supabase migration up
    ```
4.  Verify tables exist in Supabase dashboard: **SQL Editor** → Run queries to check `members`, `requests`, `connections` tables.

## 2. Google OAuth Credentials (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)

**Note:** This is for login authentication only. Database is now managed by Supabase Postgres.

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Select your ABG Connect project (same as for Sheets API).
3.  Go to **APIs & Services** → **OAuth consent screen**.
4.  Configure consent screen:
    *   **App name**: "ABG Alumni Connect"
    *   **User type**: External (for testing) or Internal (for production)
    *   **Scopes**: No extra scopes needed for OAuth sign-in
    *   Save and continue
5.  Go to **APIs & Services** → **Credentials**.
6.  Click **+ CREATE CREDENTIALS** → **OAuth client ID**.
7.  Application type: **Web application**.
8.  Name: "ABG Alumni Connect Web"
9.  **Authorized JavaScript origins**: Add these:
    *   `http://localhost:3000`
    *   `https://your-domain.com` (production domain)
10. **Authorized redirect URIs**: Add these:
    *   `http://localhost:3000/api/auth/callback/google`
    *   `https://your-domain.com/api/auth/callback/google`
11. Click **Create**.
12. Copy the **Client ID** and **Client Secret**.
13. Paste into `.env.local` as:
    ```
    GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
    GOOGLE_CLIENT_SECRET=xxx
    ```

## 3. NextAuth Configuration (`NEXTAUTH_SECRET`, `NEXTAUTH_URL`)

1.  Generate a random 32-character secret:
    ```bash
    openssl rand -base64 32
    ```
    Or use an online generator: [1Password generator](https://1password.com/password-generator/)

2.  Copy the generated secret into `.env.local`:
    ```
    NEXTAUTH_SECRET=your-random-32-char-secret-here
    ```

3.  Set the callback URL in `.env.local`:
    ```
    NEXTAUTH_URL=http://localhost:3000  # For local development
    NEXTAUTH_URL=https://your-domain.com  # For production
    ```

## 4. Gemini AI (`GEMINI_API_KEY`)
1.  Go to [Google AI Studio](https://aistudio.google.com/).
2.  Sign in with your Google account.
3.  Click **Get API key** (top left or main button).
4.  Click **Create API key in new project**.
5.  Copy the key starting with `AIza...`.
6.  Paste it into `.env.local` as `GEMINI_API_KEY`.

## 5. Resend Email (`RESEND_API_KEY`, `EMAIL_FROM`)
1.  Go to [Resend.com](https://resend.com) and sign up/login.
2.  On the dashboard, click **API Keys** (sidebar).
3.  Click **Create API Key**.
4.  Name: "ABG Connect" → Permission: "Full Access" → **Add**.
5.  Copy the key (starts with `re_...`).
6.  Paste it into `.env.local` as `RESEND_API_KEY`.
7.  Go to **Domains** and add a custom domain or use the test domain `onboarding@resend.dev`.
8.  Set `EMAIL_FROM` in `.env.local`:
    ```
    EMAIL_FROM=ABG Connect <onboarding@resend.dev>
    # Or with custom domain:
    EMAIL_FROM=ABG Connect <noreply@your-domain.com>
    ```

## 6. Vercel Blob (`BLOB_READ_WRITE_TOKEN`)
*Used for storing avatar images. If you are deploying to Vercel, this is easiest to get via the Vercel Dashboard.*

**Option A: If deploying now**
1.  Deploy the project to Vercel (see deployment guide).
2.  Go to your project in Vercel Dashboard.
3.  Click **Storage** tab → **Connect Database** → **Blob** → **Create New**.
4.  Once created, go to **Settings** → **Environment Variables**.
5.  Find `BLOB_READ_WRITE_TOKEN`, copy the value, and paste it into your local `.env.local` if you want to test locally.

**Option B: Skip for now**
If you don't need avatar upload features immediately for local testing, you can leave this blank or put a dummy value, but avatar uploads will fail.
