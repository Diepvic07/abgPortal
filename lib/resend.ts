import { Resend } from 'resend';
import { getTranslations, interpolate, type Locale } from '@/lib/i18n';

const FROM_EMAIL = 'ABG Connect <onboarding@resend.dev>';

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is not set');
  }
  return new Resend(apiKey);
}

export async function sendOnboardingConfirmation(
  to: string,
  name: string,
  bio: string,
  locale: Locale = 'en'
): Promise<void> {
  const t = getTranslations(locale);
  const resend = getResendClient();

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: t.email.onboarding.subject,
    html: `
<!DOCTYPE html>
<html lang="${locale}">
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 2px solid #007bff; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { margin: 0; font-size: 24px; color: #007bff; }
    .quote { background: #f8f9fa; border-left: 4px solid #007bff; padding: 12px 16px; margin: 16px 0; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ABG Alumni Connect</h1>
    </div>

    <h2>${interpolate(t.email.onboarding.greeting, { name })}</h2>

    <p>${t.email.onboarding.bioIntro}</p>

    <div class="quote">${bio}</div>

    <p>${t.email.onboarding.canFind}</p>

    <p>${t.email.onboarding.readyToConnect}</p>

    <p>${t.email.onboarding.regards}<br>${t.email.onboarding.signature}</p>

    <div class="footer">
      <p>${t.footer.community}</p>
    </div>
  </div>
</body>
</html>
    `,
  });

  if (error) {
    if (error.name === 'validation_error' && error.message.includes('only send testing emails')) {
      console.warn('Resend Test Mode: Email not sent to non-verified address.', error.message);
      // Do not throw, allowing the flow to continue
      return;
    }
    console.error('Failed to send onboarding email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

export async function sendIntroEmail(data: {
  requester_email: string;
  requester_name: string;
  requester_role: string;
  requester_company: string;
  target_email: string;
  target_name: string;
  request_text: string;
  match_reason: string;
  locale?: Locale;
}): Promise<void> {
  const { requester_email, requester_name, requester_role, requester_company,
    target_email, target_name, request_text, match_reason, locale = 'en' } = data;

  const t = getTranslations(locale);

  const subject = interpolate(t.email.intro.subject, { requesterName: requester_name });
  const greeting = interpolate(t.email.intro.greeting, { targetName: target_name });
  const lookingFor = interpolate(t.email.intro.lookingFor, {
    requesterName: requester_name,
    requesterRole: requester_role,
    requesterCompany: requester_company,
  });
  const footerText = interpolate(t.email.intro.footer, {
    requesterName: requester_name,
    targetName: target_name,
  });

  const html = `
<!DOCTYPE html>
<html lang="${locale}">
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 2px solid #007bff; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { margin: 0; font-size: 24px; color: #007bff; }
    .quote { background: #f8f9fa; border-left: 4px solid #007bff; padding: 12px 16px; margin: 16px 0; }
    .match-reason { background: #e8f4fd; border-radius: 8px; padding: 12px 16px; margin: 16px 0; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ABG Alumni Connect</h1>
    </div>

    <p>${greeting}</p>

    <p>${lookingFor}</p>

    <div class="quote">"${request_text}"</div>

    <div class="match-reason">
      <strong>${t.email.intro.whyMatched}</strong><br>
      ${match_reason}
    </div>

    <p>${t.email.intro.replyPrompt}</p>

    <p>${t.email.intro.regards}<br>${t.email.intro.signature}</p>

    <div class="footer">
      <p>${footerText}</p>
    </div>
  </div>
</body>
</html>
`;

  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [requester_email, target_email],
    subject,
    html,
    replyTo: requester_email,
  });

  if (error) {
    if (error.name === 'validation_error' && error.message.includes('only send testing emails')) {
      console.warn('Resend Test Mode: Email not sent to non-verified address.', error.message);

      // Fallback: Try sending ONLY to requester (who is likely the account owner)
      const { error: retryError } = await resend.emails.send({
        from: FROM_EMAIL,
        to: requester_email,
        subject: `[TEST MODE] ${subject}`,
        html: `
          <div style="background: #fff3cd; color: #856404; padding: 12px; margin-bottom: 20px; border: 1px solid #ffeeba; border-radius: 4px;">
            <strong>Test Mode Notice:</strong> This email was sent only to you because the target email (${target_email}) is unverified in Resend.
          </div>
          ${html}
        `,
        replyTo: requester_email,
      });

      if (retryError) {
        console.warn('Resend Test Mode: Failed to send fallback email to requester.', retryError);
      }
      return;
    }
    console.error('Failed to send intro email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}
