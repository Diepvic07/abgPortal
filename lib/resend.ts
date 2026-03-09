import { Resend } from 'resend';
import { getTranslations, interpolate, type Locale } from '@/lib/i18n';

const FROM_EMAIL = process.env.EMAIL_FROM || 'ABG Connect <onboarding@resend.dev>';

// Test mode: emails that receive fallback notifications when Resend domain is unverified
const TEST_MODE_EMAILS = [
  'diepvic@gmail.com',
  'diep@ejoylearning.com',
  'ttvietduc@gmail.com',
  'quephc@gmail.com',
  'diu.tran@abg.edu.vn',
];

/** Escape HTML special characters to prevent XSS in email templates */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

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

  const appUrl = process.env.NEXTAUTH_URL || 'https://abg-connect.vercel.app';

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: t.email.onboarding.subject,
    html: `<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr><td style="background:#16a34a;padding:28px 40px;">
          <h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:600;">ABG Alumni Connect</h1>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#1f2937;">${interpolate(t.email.onboarding.greeting, { name: `<strong>${escapeHtml(name)}</strong>` })}</p>
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">${t.email.onboarding.bioIntro}</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
            <tr><td style="background:#f0fdf4;border-left:4px solid #16a34a;padding:16px 20px;border-radius:0 8px 8px 0;">
              <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;font-style:italic;">${escapeHtml(bio)}</p>
            </td></tr>
          </table>
          <p style="margin:0 0 8px;font-size:15px;color:#374151;line-height:1.6;">${t.email.onboarding.canFind}</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">${t.email.onboarding.readyToConnect}</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr><td>
            <a href="${appUrl}/login" style="display:inline-block;padding:14px 36px;background:#16a34a;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">${t.email.onboarding.signInNow}</a>
          </td></tr></table>
          <p style="margin:0;font-size:15px;color:#374151;">${t.email.onboarding.regards}<br><strong>${t.email.onboarding.signature}</strong></p>
        </td></tr>
        <tr><td style="padding:24px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">${t.footer.community}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
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
  custom_message?: string;
  locale?: Locale;
}): Promise<void> {
  const { requester_email, requester_name, requester_role, requester_company,
    target_email, target_name, request_text, match_reason, custom_message, locale = 'en' } = data;

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

    ${custom_message ? `
    <div style="background: #fef9c3; border-left: 4px solid #eab308; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
      <strong>Personal message from ${requester_name}:</strong>
      <p style="margin: 8px 0 0;">${custom_message}</p>
    </div>
    ` : ''}

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

/**
 * Send approval notification email
 */
export async function sendApprovalEmail(to: string, name: string, locale: Locale = 'vi'): Promise<void> {
  const resend = getResendClient();
  const t = getTranslations(locale);
  const appUrl = process.env.NEXTAUTH_URL || 'https://abg-connect.vercel.app';

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: t.email.approval.subject,
    html: `<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr><td style="background:#16a34a;padding:28px 40px;">
          <h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:600;">ABG Alumni Connect</h1>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#1f2937;">${interpolate(t.email.approval.greeting, { name })}</p>

          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:0 0 20px;">
            <p style="margin:0;font-size:15px;color:#166534;font-weight:600;">${t.email.approval.approved}</p>
          </div>

          <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">${t.email.approval.basicMember}</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
            <tr><td style="padding:6px 0;font-size:15px;color:#374151;">&#10003; ${t.email.approval.benefit1}</td></tr>
            <tr><td style="padding:6px 0;font-size:15px;color:#374151;">&#10003; ${t.email.approval.benefit2}</td></tr>
            <tr><td style="padding:6px 0;font-size:15px;color:#374151;">&#10003; ${t.email.approval.benefit3}</td></tr>
            <tr><td style="padding:6px 0;font-size:15px;color:#374151;">&#10003; ${t.email.approval.benefit4}</td></tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr><td>
            <a href="${appUrl}/login" style="display:inline-block;padding:14px 36px;background:#2563eb;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">${t.email.approval.signInNow}</a>
          </td></tr></table>

          <div style="background:#f5f3ff;border:1px solid #c4b5fd;border-radius:8px;padding:16px;margin:0 0 20px;">
            <p style="margin:0 0 8px;font-size:15px;color:#374151;"><strong style="color:#7c3aed;">${t.email.approval.upgradeToPro}</strong> ${t.email.approval.upgradeUnlock}</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;">
              <tr><td style="padding:4px 0;font-size:14px;color:#374151;">&#10003; ${t.email.approval.proBenefit1}</td></tr>
              <tr><td style="padding:4px 0;font-size:14px;color:#374151;">&#10003; ${t.email.approval.proBenefit2}</td></tr>
              <tr><td style="padding:4px 0;font-size:14px;color:#374151;">&#10003; ${t.email.approval.proBenefit3}</td></tr>
              <tr><td style="padding:4px 0;font-size:14px;color:#374151;">&#10003; ${t.email.approval.proBenefit4}</td></tr>
            </table>
            <p style="margin:0;font-size:14px;color:#374151;">${t.email.approval.contactUpgrade} <a href="mailto:bdh.alumni@abg.edu.vn?subject=Premium Upgrade Request" style="color:#7c3aed;text-decoration:underline;">bdh.alumni@abg.edu.vn</a> ${t.email.approval.contactUpgradeSuffix}</p>
          </div>

          <p style="margin:0;font-size:15px;color:#374151;">${t.email.approval.regards}<br><strong>${t.email.approval.signature}</strong></p>
        </td></tr>
        <tr><td style="padding:24px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">${t.footer.community}</p>
        </td></tr>
      </table>
    </td></tr>
  </table></body>`,
  });

  if (error) {
    if (error.name === 'validation_error' && error.message.includes('only send testing emails')) {
      console.warn('Resend Test Mode: Approval email not sent.', error.message);
      return;
    }
    console.error('Failed to send approval email:', error);
  }
}

/**
 * Send anonymous love match notification to target
 */
export async function sendLoveMatchNotificationEmail(
  to: string,
  data: {
    interests?: string;
    core_values?: string;
    self_description?: string;
    app_url?: string;
  }
): Promise<void> {
  const resend = getResendClient();
  const appUrl = data.app_url || process.env.NEXTAUTH_URL || 'https://abg-connect.vercel.app';

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Someone is interested in connecting with you on ABG Connect',
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 2px solid #ec4899; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { margin: 0; font-size: 24px; color: #ec4899; }
    .snippet { background: #fdf2f8; border-left: 4px solid #ec4899; padding: 12px 16px; margin: 16px 0; border-radius: 4px; }
    .snippet-label { font-size: 12px; font-weight: 600; color: #9d174d; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .cta-button { display: inline-block; background: #ec4899; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
    .privacy-note { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px; margin: 16px 0; font-size: 14px; color: #166534; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ABG Alumni Connect</h1>
    </div>

    <h2>Someone wants to connect with you!</h2>

    <p>A fellow ABG alumni has expressed interest in connecting with you. Here's a glimpse of who they are:</p>

    ${data.self_description ? `
    <div class="snippet">
      <div class="snippet-label">About them</div>
      ${data.self_description}
    </div>
    ` : ''}

    ${data.interests ? `
    <div class="snippet">
      <div class="snippet-label">Interests</div>
      ${data.interests}
    </div>
    ` : ''}

    ${data.core_values ? `
    <div class="snippet">
      <div class="snippet-label">Core Values</div>
      ${data.core_values}
    </div>
    ` : ''}

    <div class="privacy-note">
      Their real name, contact info, and employer are kept private until you accept.
    </div>

    <p>Log in to view their full anonymous profile and choose to accept or pass.</p>

    <a href="${appUrl}/love-match" class="cta-button">View & Respond</a>

    <p>Best regards,<br>ABG Alumni Connect</p>

    <div class="footer">
      <p>ABG Alumni Community</p>
    </div>
  </div>
</body>
</html>
    `,
  });

  if (error) {
    if (error.name === 'validation_error' && error.message.includes('only send testing emails')) {
      console.warn('Resend Test Mode: Love match notification not sent.', error.message);
      return;
    }
    console.error('Failed to send love match notification email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

/**
 * Send love match acceptance email to both parties — reveals real info
 */
export async function sendLoveMatchAcceptEmail(data: {
  from_email: string;
  from_name: string;
  from_role: string;
  from_company: string;
  from_phone?: string;
  from_linkedin?: string;
  to_email: string;
  to_name: string;
  to_role: string;
  to_company: string;
  to_phone?: string;
  to_linkedin?: string;
}): Promise<void> {
  const resend = getResendClient();

  const buildContact = (phone?: string, linkedin?: string) => {
    const parts: string[] = [];
    if (phone) parts.push(`Phone: ${phone}`);
    if (linkedin) parts.push(`LinkedIn: <a href="${linkedin}">${linkedin}</a>`);
    return parts.length ? parts.join(' &bull; ') : 'No additional contact info shared';
  };

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 2px solid #ec4899; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { margin: 0; font-size: 24px; color: #ec4899; }
    .match-card { background: #fdf2f8; border: 1px solid #f9a8d4; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .match-card h3 { margin: 0 0 8px; color: #9d174d; }
    .match-card p { margin: 4px 0; font-size: 14px; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ABG Alumni Connect</h1>
    </div>

    <h2>You've been matched!</h2>

    <p>Great news — you and your match have both expressed mutual interest. Here are each other's contact details:</p>

    <div class="match-card">
      <h3>${data.from_name}</h3>
      <p>${data.from_role} at ${data.from_company}</p>
      <p>${buildContact(data.from_phone, data.from_linkedin)}</p>
      <p>Email: <a href="mailto:${data.from_email}">${data.from_email}</a></p>
    </div>

    <div class="match-card">
      <h3>${data.to_name}</h3>
      <p>${data.to_role} at ${data.to_company}</p>
      <p>${buildContact(data.to_phone, data.to_linkedin)}</p>
      <p>Email: <a href="mailto:${data.to_email}">${data.to_email}</a></p>
    </div>

    <p>We encourage you to reach out and start a conversation. Wishing you all the best!</p>

    <p>Best regards,<br>ABG Alumni Connect</p>

    <div class="footer">
      <p>ABG Alumni Community</p>
    </div>
  </div>
</body>
</html>
  `;

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [data.from_email, data.to_email],
    subject: "You've been matched on ABG Connect!",
    html,
    replyTo: data.from_email,
  });

  if (error) {
    if (error.name === 'validation_error' && error.message.includes('only send testing emails')) {
      console.warn('Resend Test Mode: Love match accept email not sent.', error.message);
      // Fallback: send only to from_email
      await resend.emails.send({
        from: FROM_EMAIL,
        to: data.from_email,
        subject: "[TEST MODE] You've been matched on ABG Connect!",
        html,
        replyTo: data.from_email,
      });
      return;
    }
    console.error('Failed to send love match accept email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

/**
 * Send contact request email to target member
 */
export async function sendContactRequestEmail(data: {
  target_email: string;
  target_name: string;
  requester_name: string;
  requester_email: string;
  requester_role: string;
  requester_company: string;
  message: string;
  accept_url: string;
  decline_url: string;
  locale?: Locale;
}): Promise<void> {
  const resend = getResendClient();
  const t = getTranslations(data.locale || 'vi');
  const safeName = escapeHtml(data.requester_name);
  const safeTargetName = escapeHtml(data.target_name);
  const safeRole = escapeHtml(data.requester_role);
  const safeCompany = escapeHtml(data.requester_company);
  const safeMessage = escapeHtml(data.message);
  const roleInfo = safeRole && safeCompany
    ? interpolate(t.email.contact.roleAt, { role: safeRole, company: safeCompany })
    : safeRole || safeCompany || '';

  const emailHtml = `
<!DOCTYPE html>
<html lang="${data.locale || 'vi'}">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr><td style="background:#1a56db;padding:28px 40px;">
          <h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:600;">ABG Alumni Connect</h1>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#1f2937;">${interpolate(t.email.contact.greeting, { targetName: `<strong>${safeTargetName}</strong>` })}</p>
          <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">${t.email.contact.receivedRequest}</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin:0 0 20px;">
            <tr><td style="padding:16px 20px;">
              <p style="margin:0 0 4px;font-size:17px;font-weight:600;color:#1e40af;">${safeName}</p>
              ${roleInfo ? `<p style="margin:0;font-size:14px;color:#6b7280;">${roleInfo}</p>` : ''}
            </td></tr>
          </table>
          <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#374151;">${interpolate(t.email.contact.messageFrom, { requesterName: safeName })}</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border-left:4px solid #1a56db;border-radius:0 8px 8px 0;margin:0 0 24px;">
            <tr><td style="padding:14px 18px;">
              <p style="margin:0;font-size:15px;color:#1e3a5f;line-height:1.6;white-space:pre-wrap;">${safeMessage}</p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;margin:0 0 28px;">
            <tr><td style="padding:12px 16px;">
              <p style="margin:0;font-size:13px;color:#92400e;line-height:1.5;">🔒 <strong>${t.email.contact.privacyLabel}</strong> ${t.email.contact.privacyText}</p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="padding:0 0 12px;">
                <a href="${data.accept_url}" style="display:inline-block;padding:14px 48px;background:#16a34a;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">${t.email.contact.acceptButton}</a>
              </td>
            </tr>
            <tr>
              <td align="center">
                <a href="${data.decline_url}" style="display:inline-block;padding:10px 36px;background:#ffffff;color:#6b7280;font-size:14px;font-weight:500;text-decoration:none;border-radius:8px;border:1px solid #d1d5db;">${t.email.contact.declineButton}</a>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">${t.email.contact.footerText}<br>${t.email.contact.footerIgnore}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: data.target_email,
    subject: interpolate(t.email.contact.subject, { requesterName: data.requester_name }),
    html: emailHtml,
  });

  if (error) {
    if (error.name === 'validation_error' && error.message.includes('only send testing emails')) {
      console.warn('Resend Test Mode: Contact request email not sent to target.', error.message);

      // Fallback: send only to verified test mode emails (non-test emails cause batch rejection)
      const testRecipients = [...new Set([data.requester_email, data.target_email, ...TEST_MODE_EMAILS])]
        .filter(e => TEST_MODE_EMAILS.includes(e));
      const { error: retryError } = await resend.emails.send({
        from: FROM_EMAIL,
        to: testRecipients,
        subject: `[TEST MODE] ${data.requester_name} muốn kết nối với ${data.target_name}`,
        html: `
          <div style="background:#fff3cd;color:#856404;padding:12px 16px;margin-bottom:20px;border:1px solid #ffeeba;border-radius:8px;font-size:13px;">
            <strong>⚠️ Test Mode:</strong> Target email <strong>${data.target_email}</strong> is unverified in Resend. This test email was sent to admins instead.
          </div>
          ${emailHtml}
        `,
      });

      if (retryError) {
        console.warn('Resend Test Mode: Failed to send fallback email.', retryError);
      }
      return;
    }
    console.error('Failed to send contact request email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

/** Contact info for accepted email — both parties receive the other's details */
interface ContactMemberInfo {
  email: string;
  name: string;
  role: string;
  company: string;
  phone?: string;
  facebook_url?: string;
  linkedin_url?: string;
}

/** Build HTML contact card for a member */
function buildContactCard(member: ContactMemberInfo, t: ReturnType<typeof getTranslations>): string {
  const safeName = escapeHtml(member.name);
  const safeRole = escapeHtml(member.role);
  const safeCompany = escapeHtml(member.company);
  const safeEmail = escapeHtml(member.email);
  const roleInfo = safeRole && safeCompany
    ? interpolate(t.email.contact.roleAt, { role: safeRole, company: safeCompany })
    : safeRole || safeCompany || '';

  const rows: string[] = [];
  rows.push(`<tr><td style="padding:8px 0;border-bottom:1px solid #dcfce7;">
    <span style="font-size:13px;color:#6b7280;">📧 ${t.email.contactAccepted.emailLabel}</span><br>
    <a href="mailto:${safeEmail}" style="font-size:15px;color:#1e40af;text-decoration:none;">${safeEmail}</a>
  </td></tr>`);
  if (member.phone) {
    const safePhone = escapeHtml(member.phone);
    rows.push(`<tr><td style="padding:8px 0;border-bottom:1px solid #dcfce7;">
      <span style="font-size:13px;color:#6b7280;">📱 ${t.email.contactAccepted.phoneLabel}</span><br>
      <a href="tel:${encodeURI(member.phone)}" style="font-size:15px;color:#1e40af;text-decoration:none;">${safePhone}</a>
    </td></tr>`);
  }
  if (member.facebook_url) {
    const safeFb = escapeHtml(member.facebook_url);
    rows.push(`<tr><td style="padding:8px 0;border-bottom:1px solid #dcfce7;">
      <span style="font-size:13px;color:#6b7280;">👤 ${t.email.contactAccepted.facebookLabel}</span><br>
      <a href="${encodeURI(member.facebook_url)}" style="font-size:15px;color:#1e40af;text-decoration:none;">${safeFb}</a>
    </td></tr>`);
  }
  if (member.linkedin_url) {
    const safeLi = escapeHtml(member.linkedin_url);
    rows.push(`<tr><td style="padding:8px 0;">
      <span style="font-size:13px;color:#6b7280;">💼 ${t.email.contactAccepted.linkedinLabel}</span><br>
      <a href="${encodeURI(member.linkedin_url)}" style="font-size:15px;color:#1e40af;text-decoration:none;">${safeLi}</a>
    </td></tr>`);
  }

  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;margin:0 0 24px;">
    <tr><td style="padding:20px 24px;">
      <p style="margin:0 0 4px;font-size:18px;font-weight:700;color:#166534;">${safeName}</p>
      ${roleInfo ? `<p style="margin:0 0 16px;font-size:14px;color:#4b5563;">${roleInfo}</p>` : '<div style="margin:0 0 16px;"></div>'}
      <table width="100%" cellpadding="0" cellspacing="0">${rows.join('')}</table>
    </td></tr>
  </table>`;
}

/**
 * Send contact accepted email to BOTH parties — reveals each other's full contact info
 */
export async function sendContactAcceptedEmail(data: {
  requester: ContactMemberInfo;
  target: ContactMemberInfo;
  requesterLocale?: Locale;
  targetLocale?: Locale;
}): Promise<void> {
  const resend = getResendClient();

  // Send personalized email to each party showing the other's contact card
  const parties = [
    { recipient: data.requester, otherParty: data.target, locale: data.requesterLocale || 'vi' as Locale },
    { recipient: data.target, otherParty: data.requester, locale: data.targetLocale || 'vi' as Locale },
  ];

  for (const { recipient, otherParty, locale } of parties) {
    const t = getTranslations(locale);
    const safeRecipientName = escapeHtml(recipient.name);
    const safeOtherName = escapeHtml(otherParty.name);
    const otherCard = buildContactCard(otherParty, t);
    const recipientCard = buildContactCard(recipient, t);
    const otherSectionTitle = interpolate(t.email.contactAccepted.otherSectionTitle, { name: safeOtherName });
    const yourSectionTitle = t.email.contactAccepted.yourSectionTitle;

    const emailHtml = `
<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr><td style="background:#16a34a;padding:28px 40px;">
          <h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:600;">ABG Alumni Connect</h1>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#1f2937;">${interpolate(t.email.contactAccepted.greeting, { recipientName: `<strong>${safeRecipientName}</strong>` })}</p>
          <p style="margin:0 0 8px;font-size:15px;color:#374151;line-height:1.6;">${interpolate(t.email.contactAccepted.goodNews, { otherName: `<strong>${safeOtherName}</strong>` })}</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">${t.email.contactAccepted.contactInfo}</p>
          <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#166534;">${otherSectionTitle}</p>
          ${otherCard}
          <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#166534;">${yourSectionTitle}</p>
          ${recipientCard}
          <p style="margin:0 0 8px;font-size:15px;color:#374151;line-height:1.6;">${t.email.contactAccepted.encourage}</p>
        </td></tr>
        <tr><td style="padding:24px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">${t.email.contactAccepted.regards}<br><strong>${t.email.contactAccepted.signature}</strong></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: recipient.email,
      subject: interpolate(t.email.contactAccepted.subject, { otherName: otherParty.name }),
      html: emailHtml,
    });

    if (error) {
      if (error.name === 'validation_error' && error.message.includes('only send testing emails')) {
        console.warn(`Resend Test Mode: Accepted email not sent to ${recipient.email}.`, error.message);
        const testRecipients = [...new Set([recipient.email, ...TEST_MODE_EMAILS])]
          .filter(e => TEST_MODE_EMAILS.includes(e));
        if (testRecipients.length) {
          await resend.emails.send({
            from: FROM_EMAIL,
            to: testRecipients,
            subject: `[TEST MODE] ${interpolate(t.email.contactAccepted.subject, { otherName: otherParty.name })}`,
            html: `<div style="background:#d1fae5;color:#065f46;padding:12px 16px;margin-bottom:20px;border:1px solid #a7f3d0;border-radius:8px;font-size:13px;">
              <strong>Test Mode:</strong> Acceptance email for <strong>${escapeHtml(recipient.email)}</strong>. Sent to admins for testing.
            </div>${emailHtml}`,
          }).catch(e => console.warn('Test mode fallback failed:', e));
        }
        continue;
      }
      console.error(`Failed to send accepted email to ${recipient.email}:`, error);
    }
  }
}

/**
 * Send contact declined email to requester — names the target (non-love-match only)
 */
export async function sendContactDeclinedEmail(data: {
  requester_email: string;
  requester_name: string;
  target_name: string;
  locale?: Locale;
}): Promise<void> {
  const resend = getResendClient();
  const t = getTranslations(data.locale || 'vi');
  const safeName = escapeHtml(data.requester_name);
  const safeTargetName = escapeHtml(data.target_name);
  const appUrl = process.env.NEXTAUTH_URL || 'https://abg-connect.vercel.app';

  const emailHtml = `
<!DOCTYPE html>
<html lang="${data.locale || 'vi'}">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr><td style="background:#1a56db;padding:28px 40px;">
          <h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:600;">ABG Alumni Connect</h1>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#1f2937;">${interpolate(t.email.contactDeclined.greeting, { requesterName: `<strong>${safeName}</strong>` })}</p>
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">${interpolate(t.email.contactDeclined.thanks, { targetName: `<strong>${safeTargetName}</strong>` })}</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">${t.email.contactDeclined.encourage}</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${appUrl}/request" style="display:inline-block;padding:12px 36px;background:#1a56db;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">${t.email.contactDeclined.ctaButton}</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">${t.email.contactDeclined.regards}<br><strong>${t.email.contactDeclined.signature}</strong></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: data.requester_email,
    subject: interpolate(t.email.contactDeclined.subject, { targetName: data.target_name }),
    html: emailHtml,
  });

  if (error) {
    if (error.name === 'validation_error' && error.message.includes('only send testing emails')) {
      console.warn('Resend Test Mode: Contact declined email not sent.', error.message);
      const testRecipients = [...new Set([data.requester_email, ...TEST_MODE_EMAILS])]
        .filter(e => TEST_MODE_EMAILS.includes(e));
      const { error: retryError } = await resend.emails.send({
        from: FROM_EMAIL,
        to: testRecipients,
        subject: `[TEST MODE] ${interpolate(t.email.contactDeclined.subject, { targetName: data.target_name })}`,
        html: `<div style="background:#fee2e2;color:#991b1b;padding:12px 16px;margin-bottom:20px;border:1px solid #fecaca;border-radius:8px;font-size:13px;">
          <strong>Test Mode:</strong> Decline email for <strong>${escapeHtml(data.requester_email)}</strong>. Sent to admins for testing.
        </div>${emailHtml}`,
      });
      if (retryError) {
        console.warn('Resend Test Mode: Failed to send declined fallback.', retryError);
      }
      return;
    }
    console.error('Failed to send contact declined email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

/**
 * Send premium upgrade notification email with link to start searching
 */
export async function sendPremiumUpgradeEmail(to: string, name: string, locale: Locale = 'vi'): Promise<void> {
  const resend = getResendClient();
  const t = getTranslations(locale);
  const appUrl = process.env.NEXTAUTH_URL || 'https://abg-connect.vercel.app';
  const safeName = escapeHtml(name);

  const emailHtml = `
<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr><td style="background:linear-gradient(135deg,#7c3aed,#2563eb);padding:28px 40px;">
          <h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:600;">ABG Alumni Connect</h1>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#1f2937;">${interpolate(t.email.premium.greeting, { name: `<strong>${safeName}</strong>` })}</p>

          <div style="background:#f5f3ff;border:1px solid #c4b5fd;border-radius:10px;padding:20px;margin:0 0 24px;text-align:center;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#7c3aed;text-transform:uppercase;letter-spacing:0.05em;">${t.email.premium.yourMembership}</p>
            <p style="margin:0;font-size:24px;font-weight:700;color:#5b21b6;">${t.email.premium.premiumMember}</p>
          </div>

          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">${t.email.premium.congrats}</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr><td style="padding:8px 0;font-size:15px;color:#374151;">&#10003; ${t.email.premium.benefit1}</td></tr>
            <tr><td style="padding:8px 0;font-size:15px;color:#374151;">&#10003; ${t.email.premium.benefit2}</td></tr>
            <tr><td style="padding:8px 0;font-size:15px;color:#374151;">&#10003; ${t.email.premium.benefit3}</td></tr>
            <tr><td style="padding:8px 0;font-size:15px;color:#374151;">&#10003; ${t.email.premium.benefit4}</td></tr>
          </table>

          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">${t.email.premium.startExploring}</p>

          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:0 0 12px;">
              <a href="${appUrl}/request" style="display:inline-block;padding:14px 48px;background:#7c3aed;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">${t.email.premium.ctaButton}</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">${t.email.premium.regards}<br><strong>${t.email.premium.signature}</strong></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: t.email.premium.subject,
    html: emailHtml,
  });

  if (error) {
    if (error.name === 'validation_error' && error.message.includes('only send testing emails')) {
      console.warn('Resend Test Mode: Premium upgrade email not sent.', error.message);
      return;
    }
    console.error('Failed to send premium upgrade email:', error);
  }
}

/**
 * Send rejection notification email
 */
export async function sendRejectionEmail(to: string, name: string, locale: Locale = 'vi'): Promise<void> {
  const resend = getResendClient();
  const t = getTranslations(locale);

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: t.email.rejection.subject,
    html: `<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr><td style="background:#1a56db;padding:28px 40px;">
          <h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:600;">ABG Alumni Connect</h1>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#1f2937;">${interpolate(t.email.rejection.greeting, { name: `<strong>${escapeHtml(name)}</strong>` })}</p>

          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">${t.email.rejection.thanks}</p>

          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">${t.email.rejection.unableToVerify}</p>

          <ul style="margin:0 0 16px;padding-left:20px;font-size:15px;color:#374151;line-height:1.8;">
            <li>${t.email.rejection.reason1}</li>
            <li>${t.email.rejection.reason2}</li>
            <li>${t.email.rejection.reason3}</li>
          </ul>

          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:0 0 16px;">
            <p style="margin:0;font-size:14px;color:#92400e;line-height:1.6;"><strong>${t.email.rejection.mistake}</strong> ${t.email.rejection.mistakeHelp}</p>
          </div>

          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">${t.email.rejection.contactUs} <a href="mailto:bdh.alumni@abg.edu.vn?subject=Membership Application Inquiry" style="color:#1a56db;text-decoration:underline;">bdh.alumni@abg.edu.vn</a> ${t.email.rejection.contactUsSuffix}</p>

          <p style="margin:0;font-size:15px;color:#374151;">${t.email.rejection.regards}<br><strong>${t.email.rejection.signature}</strong></p>
        </td></tr>
        <tr><td style="padding:24px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">${t.footer.community}</p>
        </td></tr>
      </table>
    </td></tr>
  </table></body>`,
  });

  if (error) {
    if (error.name === 'validation_error' && error.message.includes('only send testing emails')) {
      console.warn('Resend Test Mode: Rejection email not sent.', error.message);
      return;
    }
    console.error('Failed to send rejection email:', error);
  }
}
