# ABG Alumni Connect

AI-powered member matching platform for ABG Alumni community (~300 users).

## Features

- **Member Onboarding**: Form with AI-generated bio via Gemini
- **Connection Matching**: AI-powered matching based on needs and expertise
- **Email Introductions**: Automated intro emails to both parties via Resend
- **Admin Notifications**: Discord webhooks for new members/requests/connections

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Google Sheets API
- **AI**: Gemini 1.5 Flash
- **Email**: Resend
- **Notifications**: Discord Webhooks
- **Storage**: Vercel Blob (voice uploads)
- **Hosting**: Vercel

## Getting Started

### 1. Clone and Install

```bash
cd abg-alumni-connect
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.local` and fill in values:

```bash
cp .env.example .env.local
```

Required variables:
- `GOOGLE_SHEETS_ID` - Spreadsheet ID from URL
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` - Service account email
- `GOOGLE_PRIVATE_KEY` - Service account private key (with quotes)
- `GEMINI_API_KEY` - From Google AI Studio
- `RESEND_API_KEY` - From Resend dashboard
- `DISCORD_WEBHOOK_URL` - Discord channel webhook
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob token

### 3. Setup Google Sheets

Create a spreadsheet with 3 sheets:
- **Members** - Headers in row 1
- **Requests** - Headers in row 1
- **Connections** - Headers in row 1

Or run the seed script after configuring env:

```bash
npx tsx scripts/seed-test-data.ts
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/
  layout.tsx           # Root layout with header/footer
  page.tsx             # Landing page
  onboard/page.tsx     # Member onboarding form
  request/page.tsx     # Connection request form
  error.tsx            # Global error page
  loading.tsx          # Global loading state
  api/
    onboard/route.ts   # POST - create member
    request/route.ts   # POST - find matches
    connect/route.ts   # POST - send intro email

components/
  forms/
    member-onboarding-form.tsx
    connection-request-form.tsx
  ui/
    loading-spinner.tsx
    toast-provider.tsx
  match-results-display.tsx

lib/
  google-sheets.ts     # Sheets CRUD operations
  gemini.ts            # AI text generation
  resend.ts            # Email sending
  discord.ts           # Webhook notifications
  utils.ts             # Helpers (UUID, dates, cn)
  api-response.ts      # API response helpers

types/
  index.ts             # TypeScript interfaces
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import in Vercel
3. Add all environment variables
4. Deploy

See [docs/admin-operations-guide.md](docs/admin-operations-guide.md) for full deployment checklist.

## User Flows

### Onboarding
1. User fills form with profile info
2. Gemini generates professional bio
3. Member saved to Google Sheets
4. Confirmation email sent via Resend
5. Admin notified via Discord

### Connection Request
1. Member describes what they need
2. System verifies membership (paid or 1 free request)
3. Gemini matches with relevant members
4. User selects preferred match
5. Intro email sent to both parties
6. Connection logged, admin notified

## License

Private - ABG Alumni Community
