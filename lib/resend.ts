import { Resend } from 'resend';
import { getTranslations, interpolate, type Locale } from '@/lib/i18n';

const FROM_EMAIL = process.env.EMAIL_FROM || 'ABG Connect <onboarding@resend.dev>';

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
export async function sendApprovalEmail(to: string, name: string): Promise<void> {
  const resend = getResendClient();

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Welcome to ABG Alumni Connect - Application Approved!",
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 2px solid #22c55e; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { margin: 0; font-size: 24px; color: #22c55e; }
    .success-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .cta-button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ABG Alumni Connect</h1>
    </div>

    <h2>Congratulations, ${name}!</h2>

    <div class="success-box">
      <p style="margin: 0;"><strong>Your membership application has been approved.</strong></p>
    </div>

    <p>You now have full access to the ABG Alumni Connect platform. You can:</p>
    <ul>
      <li>Search and connect with fellow ABG alumni</li>
      <li>Submit connection requests and get AI-powered matches</li>
      <li>Update your profile and showcase your expertise</li>
    </ul>

    <a href="${process.env.NEXTAUTH_URL || 'https://abg-connect.vercel.app'}/login" class="cta-button">
      Sign In Now
    </a>

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
  requester_role: string;
  requester_company: string;
  message: string;
  accept_url: string;
  decline_url: string;
}): Promise<void> {
  const resend = getResendClient();

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: data.target_email,
    subject: `[ABG Connect] ${data.requester_name} muốn kết nối với bạn`,
    html: `
<!DOCTYPE html>
<html lang="vi">
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 2px solid #007bff; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { margin: 0; font-size: 24px; color: #007bff; }
    .requester-info { background: #f8f9fa; border-left: 4px solid #007bff; padding: 12px 16px; margin: 16px 0; border-radius: 4px; }
    .message-box { background: #e8f4fd; border-radius: 8px; padding: 12px 16px; margin: 16px 0; font-style: italic; }
    .actions { margin: 24px 0; }
    .btn { display: inline-block; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-right: 12px; }
    .btn-accept { background: #22c55e; color: white; }
    .btn-decline { background: #9ca3af; color: white; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ABG Alumni Connect</h1>
    </div>

    <p>Xin chào <strong>${data.target_name}</strong>,</p>

    <p>Một thành viên ABG Alumni muốn kết nối với bạn:</p>

    <div class="requester-info">
      <strong>${data.requester_name}</strong><br>
      ${data.requester_role}${data.requester_company ? ` tại ${data.requester_company}` : ''}
    </div>

    <p><strong>Lời nhắn:</strong></p>
    <div class="message-box">${data.message}</div>

    <p>Nếu bạn chấp nhận, thông tin liên hệ của bạn sẽ được chia sẻ với họ.</p>

    <div class="actions">
      <a href="${data.accept_url}" class="btn btn-accept">Chấp nhận</a>
      <a href="${data.decline_url}" class="btn btn-decline">Từ chối</a>
    </div>

    <p>Trân trọng,<br>ABG Alumni Connect</p>

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
      console.warn('Resend Test Mode: Contact request email not sent.', error.message);
      return;
    }
    console.error('Failed to send contact request email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

/**
 * Send contact accepted email to requester — reveals target's contact info
 */
export async function sendContactAcceptedEmail(data: {
  requester_email: string;
  requester_name: string;
  target_name: string;
  target_role: string;
  target_company: string;
  target_phone?: string;
  target_email: string;
}): Promise<void> {
  const resend = getResendClient();

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: data.requester_email,
    subject: `[ABG Connect] ${data.target_name} đã chấp nhận yêu cầu kết nối`,
    html: `
<!DOCTYPE html>
<html lang="vi">
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 2px solid #22c55e; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { margin: 0; font-size: 24px; color: #22c55e; }
    .contact-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .contact-card h3 { margin: 0 0 8px; color: #166534; }
    .contact-card p { margin: 4px 0; font-size: 14px; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ABG Alumni Connect</h1>
    </div>

    <p>Xin chào <strong>${data.requester_name}</strong>,</p>

    <p>Tin vui! <strong>${data.target_name}</strong> đã chấp nhận yêu cầu kết nối của bạn. Đây là thông tin liên hệ của họ:</p>

    <div class="contact-card">
      <h3>${data.target_name}</h3>
      <p>${data.target_role}${data.target_company ? ` tại ${data.target_company}` : ''}</p>
      <p>Email: <a href="mailto:${data.target_email}">${data.target_email}</a></p>
      ${data.target_phone ? `<p>Điện thoại: ${data.target_phone}</p>` : ''}
    </div>

    <p>Hãy liên hệ và bắt đầu kết nối nhé!</p>

    <p>Trân trọng,<br>ABG Alumni Connect</p>

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
      console.warn('Resend Test Mode: Contact accepted email not sent.', error.message);
      return;
    }
    console.error('Failed to send contact accepted email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

/**
 * Send contact declined email to requester — no target details revealed
 */
export async function sendContactDeclinedEmail(data: {
  requester_email: string;
  requester_name: string;
}): Promise<void> {
  const resend = getResendClient();

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: data.requester_email,
    subject: `[ABG Connect] Cập nhật yêu cầu kết nối`,
    html: `
<!DOCTYPE html>
<html lang="vi">
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 2px solid #007bff; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { margin: 0; font-size: 24px; color: #007bff; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ABG Alumni Connect</h1>
    </div>

    <p>Xin chào <strong>${data.requester_name}</strong>,</p>

    <p>Yêu cầu kết nối của bạn hiện không được chấp nhận vào lúc này.</p>

    <p>Bạn có thể tiếp tục khám phá và kết nối với các thành viên khác trong cộng đồng ABG Alumni.</p>

    <p>Trân trọng,<br>ABG Alumni Connect</p>

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
      console.warn('Resend Test Mode: Contact declined email not sent.', error.message);
      return;
    }
    console.error('Failed to send contact declined email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

/**
 * Send rejection notification email
 */
export async function sendRejectionEmail(to: string, name: string): Promise<void> {
  const resend = getResendClient();

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "ABG Alumni Connect - Application Update",
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 2px solid #007bff; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { margin: 0; font-size: 24px; color: #007bff; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ABG Alumni Connect</h1>
    </div>

    <p>Hi ${name},</p>

    <p>Thank you for your interest in ABG Alumni Connect.</p>

    <p>After reviewing your application, we're unable to approve your membership at this time.</p>

    <p>If you believe this is an error or have questions, please contact our admin team at <a href="mailto:admin@abg.vn">admin@abg.vn</a>.</p>

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
      console.warn('Resend Test Mode: Rejection email not sent.', error.message);
      return;
    }
    console.error('Failed to send rejection email:', error);
  }
}
