/**
 * Magic link email template for NextAuth Email provider
 */
export function getMagicLinkEmailHtml(url: string, host: string): string {
  const escapedHost = host.replace(/\./g, "&#8203;.");

  return `
<!DOCTYPE html>
<html lang="en">
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
                Click the button below to sign in to your account:
              </p>

              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 8px 0 32px 0;">
                    <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.3);">
                      Sign In
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0 0 24px 0;">

              <!-- Alternative link -->
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #6b7280; text-align: center;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 24px 0; font-size: 12px; color: #9ca3af; word-break: break-all; text-align: center;">
                ${url}
              </p>

              <!-- Footer -->
              <p style="margin: 0; font-size: 13px; color: #9ca3af; text-align: center;">
                This link expires in 24 hours. If you didn't request this email, you can safely ignore it.
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

export function getMagicLinkEmailText(url: string): string {
  return `Sign in to ABG Alumni Connect\n\nClick the link below to sign in:\n${url}\n\nThis link expires in 24 hours.\nIf you didn't request this email, you can safely ignore it.`;
}
