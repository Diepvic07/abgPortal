/**
 * Send all email types to test address for visual verification.
 * Sends both Vietnamese (default) and English versions.
 * Usage: npx tsx scripts/send-test-emails.ts
 */
import 'dotenv/config';

// Load .env.local manually since dotenv/config only loads .env
import { config } from 'dotenv';
config({ path: '.env.local' });

import {
  sendOnboardingConfirmation,
  sendApprovalEmail,
  sendRejectionEmail,
  sendPremiumUpgradeEmail,
  sendContactRequestEmail,
  sendContactAcceptedEmail,
  sendContactDeclinedEmail,
} from '../lib/resend';
import type { Locale } from '../lib/i18n/utils';

const TO_EMAIL = 'diepvic@gmail.com';
const APP_URL = process.env.NEXTAUTH_URL || 'https://abg-connect.vercel.app';

async function main() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) { console.error('RESEND_API_KEY not set'); process.exit(1); }

  const locales: Locale[] = ['vi', 'en'];
  let sent = 0;
  let failed = 0;

  for (const locale of locales) {
    const tag = locale.toUpperCase();
    console.log(`\n--- Sending ${tag} emails to ${TO_EMAIL} ---\n`);

    // 1. Onboarding Confirmation
    try {
      await sendOnboardingConfirmation(
        TO_EMAIL,
        'Nguyễn Văn Test',
        'A passionate software engineer with 5 years of experience in fintech, specializing in payment systems and cloud architecture.',
        locale
      );
      console.log(`✅ [${tag}] 1. Onboarding Confirmation`);
      sent++;
    } catch (e) {
      console.log(`❌ [${tag}] 1. Onboarding Confirmation: ${(e as Error).message}`);
      failed++;
    }
    await delay();

    // 2. Application Approved
    try {
      await sendApprovalEmail(TO_EMAIL, 'Nguyễn Văn Test', locale);
      console.log(`✅ [${tag}] 2. Application Approved`);
      sent++;
    } catch (e) {
      console.log(`❌ [${tag}] 2. Application Approved: ${(e as Error).message}`);
      failed++;
    }
    await delay();

    // 3. Application Rejected
    try {
      await sendRejectionEmail(TO_EMAIL, 'Nguyễn Văn Test', locale);
      console.log(`✅ [${tag}] 3. Application Rejected`);
      sent++;
    } catch (e) {
      console.log(`❌ [${tag}] 3. Application Rejected: ${(e as Error).message}`);
      failed++;
    }
    await delay();

    // 4. Premium Upgrade
    try {
      await sendPremiumUpgradeEmail(TO_EMAIL, 'Nguyễn Văn Test', locale);
      console.log(`✅ [${tag}] 4. Premium Upgrade`);
      sent++;
    } catch (e) {
      console.log(`❌ [${tag}] 4. Premium Upgrade: ${(e as Error).message}`);
      failed++;
    }
    await delay();

    // 5. Contact Request
    try {
      await sendContactRequestEmail({
        target_email: TO_EMAIL,
        target_name: 'Nguyễn Văn Test',
        requester_name: 'Trần Minh Hiring',
        requester_email: TO_EMAIL,
        requester_role: 'HR Director',
        requester_company: 'VNG Corporation',
        message: 'Chào bạn, mình đang tìm Senior Backend Engineer cho team Payment. Profile bạn rất phù hợp, mình muốn trao đổi thêm.',
        accept_url: `${APP_URL}/api/contact/respond?token=test-token&action=accept`,
        decline_url: `${APP_URL}/api/contact/respond?token=test-token&action=decline`,
        locale,
      });
      console.log(`✅ [${tag}] 5. Contact Request`);
      sent++;
    } catch (e) {
      console.log(`❌ [${tag}] 5. Contact Request: ${(e as Error).message}`);
      failed++;
    }
    await delay();

    // 6. Contact Accepted
    try {
      await sendContactAcceptedEmail({
        requester: {
          id: 'test-user-id-1',
          email: TO_EMAIL,
          name: 'Trần Minh Hiring',
          role: 'HR Director',
          company: 'Tech Startup VN',
          phone: '0987654321',
          linkedin_url: 'https://linkedin.com/in/minh-hr-123',
        },
        target: {
          id: 'test-user-id-2',
          email: TO_EMAIL,
          name: 'Lê Văn Tìm Việc',
          role: 'Product Manager',
          company: 'Looking for new opportunities',
          phone: '',
          linkedin_url: 'https://linkedin.com/in/le-van-pm',
        },
        requesterLocale: locale,
        targetLocale: locale,
      });
      console.log(`✅ [${tag}] 6. Contact Accepted (both parties)`);
      sent++;
    } catch (e) {
      console.log(`❌ [${tag}] 6. Contact Accepted: ${(e as Error).message}`);
      failed++;
    }
    await delay();

    // 7. Contact Declined
    try {
      await sendContactDeclinedEmail({
        requester_email: TO_EMAIL,
        requester_name: 'Trần Minh Hiring',
        target_name: 'Nguyễn Văn Test',
        locale,
      });
      console.log(`✅ [${tag}] 7. Contact Declined`);
      sent++;
    } catch (e) {
      console.log(`❌ [${tag}] 7. Contact Declined: ${(e as Error).message}`);
      failed++;
    }
    await delay();
  }

  console.log(`\nDone! Sent: ${sent}, Failed: ${failed}. Check inbox at ${TO_EMAIL}`);
}

function delay(ms = 500) {
  return new Promise(r => setTimeout(r, ms));
}

main().catch(console.error);
