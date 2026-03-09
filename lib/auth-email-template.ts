/**
 * Magic link email template for NextAuth Email provider
 * Defaults to Vietnamese; uses English only when member's locale is 'en'
 */

type MagicLinkLocale = 'vi' | 'en';

const translations: Record<MagicLinkLocale, {
  subject: string;
  message: string;
  button: string;
  altText: string;
  footer: string;
  textBody: (url: string) => string;
}> = {
  vi: {
    subject: 'Đăng nhập ABG Alumni Connect',
    message: 'Nhấn nút bên dưới để đăng nhập tài khoản của bạn:',
    button: 'Đăng nhập',
    altText: 'Nếu nút không hoạt động, sao chép và dán liên kết này vào trình duyệt:',
    footer: 'Liên kết này hết hạn sau 24 giờ. Nếu bạn không yêu cầu email này, bạn có thể bỏ qua.',
    textBody: (url: string) =>
      `Đăng nhập ABG Alumni Connect\n\nNhấn vào liên kết bên dưới để đăng nhập:\n${url}\n\nLiên kết hết hạn sau 24 giờ.\nNếu bạn không yêu cầu email này, bạn có thể bỏ qua.`,
  },
  en: {
    subject: 'Sign in to ABG Alumni Connect',
    message: 'Click the button below to sign in to your account:',
    button: 'Sign In',
    altText: "If the button doesn't work, copy and paste this link into your browser:",
    footer: "This link expires in 24 hours. If you didn't request this email, you can safely ignore it.",
    textBody: (url: string) =>
      `Sign in to ABG Alumni Connect\n\nClick the link below to sign in:\n${url}\n\nThis link expires in 24 hours.\nIf you didn't request this email, you can safely ignore it.`,
  },
};

export function getMagicLinkEmailSubject(locale: MagicLinkLocale = 'vi'): string {
  return translations[locale].subject;
}

export function getMagicLinkEmailHtml(url: string, host: string, locale: MagicLinkLocale = 'vi'): string {
  const escapedHost = host.replace(/\./g, "&#8203;.");
  const t = translations[locale];
  const lang = locale === 'vi' ? 'vi' : 'en';

  return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding: 40px 32px;">
              <!-- Logo/Title -->
              <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 700; color: #111827; text-align: center;">
                ABG Alumni Connect
              </h1>

              <!-- Message -->
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 24px; color: #374151; text-align: center;">
                ${t.message}
              </p>

              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 8px 0 32px 0;">
                    <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.3);">
                      ${t.button}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0 0 24px 0;">

              <!-- Alternative link -->
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #6b7280; text-align: center;">
                ${t.altText}
              </p>
              <p style="margin: 0 0 24px 0; font-size: 12px; color: #9ca3af; word-break: break-all; text-align: center;">
                ${url}
              </p>

              <!-- Footer -->
              <p style="margin: 0; font-size: 13px; color: #9ca3af; text-align: center;">
                ${t.footer}
              </p>
            </td>
          </tr>
        </table>

        <!-- Footer note -->
        <p style="margin: 24px 0 0 0; font-size: 12px; color: #9ca3af; text-align: center;">
          Sent from ${escapedHost}
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function getMagicLinkEmailText(url: string, locale: MagicLinkLocale = 'vi'): string {
  return translations[locale].textBody(url);
}
