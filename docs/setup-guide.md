# ABG Alumni Connect - Setup & Configuration Guide

This guide will help you obtain all the necessary API keys and configure the environment for the ABG Alumni Connect platform.

## 1. Google Sheets Configuration

### Step A: Create the Spreadsheet
1.  Go to [Google Sheets](https://sheets.new) and create a new spreadsheet.
2.  **Name**: You can name it anything, e.g., "**ABG Alumni Database**".
3.  **Create Tabs**: Rename the default tab and create new ones so you have exactly these 3 tabs (case-sensitive):
    *   `Members`
    *   `Requests`
    *   `Connections`
4.  **Get ID**: Look at the URL of your spreadsheet:
    `https://docs.google.com/spreadsheets/d/TOTAL_GIBBERISH_ID_HERE/edit...`
    *   Copy the long string between `/d/` and `/edit`.
    *   Paste this into `.env.local` as `GOOGLE_SHEETS_ID`.

### Step B: Google Cloud Credentials (`GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`)
1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  **Create Project**: Click the project dropdown (top left) → "New Project" → Name it "ABG Connect" → Create.
3.  **Enable Sheets API**:
    *   Go to "APIs & Services" → "Library".
    *   Search for "**Google Sheets API**".
    *   Click **Enable**.
4.  **Create Service Account**:
    *   Go to "APIs & Services" → "Credentials".
    *   Click "+ CREATE CREDENTIALS" → "Service Account".
    *   Name: `abg-bot` (or similar).
    *   Click **Create and Continue** → **Done** (skip role assignment for now).
5.  **Get Email**:
    *   You will see an email like `abg-bot@your-project.iam.gserviceaccount.com`.
    *   Copy this email and paste it into `.env.local` as `GOOGLE_SERVICE_ACCOUNT_EMAIL`.
6.  **Get Private Key**:
    *   Click on the service account email to open details.
    *   Go to the **Keys** tab.
    *   Click "Add Key" → "Create new key" → **JSON**.
    *   A file will download. Open it with a text editor.
    *   Copy the `private_key` value (it starts with `-----BEGIN PRIVATE KEY-----`).
    *   Paste this into `.env.local` as `GOOGLE_PRIVATE_KEY`.
        *   *Note: Ensure it is all on one line or properly quoted if your environment requires it, but usually pasting the multiline string inside quotes works for `.env` files.*
7.  **Share Sheet**:
    *   Go back to your Google Sheet.
    *   Click **Share** (top right).
    *   Paste the **Service Account Email** (`abg-bot@...`) into the box.
    *   Make sure "Editor" is selected.
    *   Click **Send** (uncheck "Notify people" if you want).

## 2. Gemini AI (`GEMINI_API_KEY`)
1.  Go to [Google AI Studio](https://aistudio.google.com/).
2.  Sign in with your Google account.
3.  Click **Get API key** (top left or main button).
4.  Click **Create API key in new project**.
5.  Copy the key starting with `AIza...`.
6.  Paste it into `.env.local` as `GEMINI_API_KEY`.

## 3. Resend Email (`RESEND_API_KEY`)
1.  Go to [Resend.com](https://resend.com) and sign up/login.
2.  On the dashboard, click **API Keys** (sidebar).
3.  Click **Create API Key**.
4.  Name: "ABG Connect" → Permission: "Full Access" → **Add**.
5.  Copy the key (starts with `re_...`).
6.  Paste it into `.env.local` as `RESEND_API_KEY`.

## 4. Discord Notifications (`DISCORD_WEBHOOK_URL`)
1.  Open Discord and go to the server/channel where you want notifications (e.g., `#admin-alerts`).
2.  Click the **Gear icon** (Edit Channel) next to the channel name.
3.  Go to **Integrations** → **Webhooks**.
4.  Click **New Webhook**.
5.  Name it "ABG Bot".
6.  Click **Copy Webhook URL**.
7.  Paste it into `.env.local` as `DISCORD_WEBHOOK_URL`.

## 5. Vercel Blob (`BLOB_READ_WRITE_TOKEN`)
*Used for storing voice introductions. If you are deploying to Vercel, this is easiest to get via the Vercel Dashboard.*

**Option A: If deploying now**
1.  Deploy the project to Vercel (see deployment guide).
2.  Go to your project in Vercel Dashboard.
3.  Click **Storage** tab → **Connect Database** → **Blob** → **Create New**.
4.  Once created, go to **Settings** → **Environment Variables**.
5.  Find `BLOB_READ_WRITE_TOKEN`, copy the value, and paste it into your local `.env.local` if you want to test locally.

**Option B: Skip for now**
If you don't need voice features immediately for local testing, you can leave this blank or put a dummy value, but voice upload features will fail.
