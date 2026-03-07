/**
 * Send all email types to test address for visual verification.
 * Usage: npx tsx scripts/send-test-emails.ts
 */
import 'dotenv/config';

// Load .env.local manually since dotenv/config only loads .env
import { config } from 'dotenv';
config({ path: '.env.local' });

import { Resend } from 'resend';

const FROM_EMAIL = process.env.EMAIL_FROM || 'ABG Connect <onboarding@resend.dev>';
const TO_EMAIL = 'diepvic@gmail.com';
const APP_URL = process.env.NEXTAUTH_URL || 'https://abg-connect.vercel.app';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function main() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) { console.error('RESEND_API_KEY not set'); process.exit(1); }
  const resend = new Resend(apiKey);

  const emails: { name: string; subject: string; html: string }[] = [];

  // 1. Onboarding Confirmation
  emails.push({
    name: '1. Onboarding Confirmation',
    subject: '[TEST] Welcome to ABG Alumni Connect!',
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <h1 style="color:#007bff;border-bottom:2px solid #007bff;padding-bottom:16px;">ABG Alumni Connect</h1>
      <h2>Welcome, Nguyễn Văn Test!</h2>
      <p>Here's your AI-generated bio:</p>
      <div style="background:#f8f9fa;border-left:4px solid #007bff;padding:12px 16px;margin:16px 0;">
        A passionate software engineer with 5 years of experience in fintech, specializing in payment systems and cloud architecture.
      </div>
      <p>Your application is being reviewed by the admin team.</p>
      <p>Best regards,<br>ABG Alumni Connect</p>
    </div>`,
  });

  // 2. Application Approved
  emails.push({
    name: '2. Application Approved',
    subject: '[TEST] Welcome to ABG Alumni Connect - Application Approved!',
    html: `<body style="margin:0;padding:0;background:#f4f4f7;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr><td style="background:#16a34a;padding:28px 40px;">
          <h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:600;">ABG Alumni Connect</h1>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#1f2937;">Congratulations, Nguyễn Văn Test!</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:0 0 20px;">
            <p style="margin:0;font-size:15px;color:#166534;font-weight:600;">Your membership application has been approved.</p>
          </div>
          <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">You've been activated as a <strong>Basic Member</strong>. Here's what you can do right away:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
            <tr><td style="padding:6px 0;font-size:15px;color:#374151;">&#10003; Browse and search the ABG alumni directory</td></tr>
            <tr><td style="padding:6px 0;font-size:15px;color:#374151;">&#10003; Update your profile and showcase your expertise</td></tr>
            <tr><td style="padding:6px 0;font-size:15px;color:#374151;">&#10003; Submit up to 5 connection requests per month</td></tr>
            <tr><td style="padding:6px 0;font-size:15px;color:#374151;">&#10003; Up to 3 AI-powered searches per month</td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr><td>
            <a href="${APP_URL}/login" style="display:inline-block;padding:14px 36px;background:#2563eb;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">Sign In Now</a>
          </td></tr></table>
          <div style="background:#f5f3ff;border:1px solid #c4b5fd;border-radius:8px;padding:16px;margin:0 0 20px;">
            <p style="margin:0 0 8px;font-size:15px;color:#374151;"><strong style="color:#7c3aed;">Upgrade to Pro</strong> to unlock full access:</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;">
              <tr><td style="padding:4px 0;font-size:14px;color:#374151;">&#10003; Up to 50 connection requests per month</td></tr>
              <tr><td style="padding:4px 0;font-size:14px;color:#374151;">&#10003; See full member profiles (name, phone, LinkedIn)</td></tr>
              <tr><td style="padding:4px 0;font-size:14px;color:#374151;">&#10003; Up to 10 AI-powered searches per month</td></tr>
              <tr><td style="padding:4px 0;font-size:14px;color:#374151;">&#10003; Priority matching and support</td></tr>
            </table>
            <p style="margin:0;font-size:14px;color:#374151;">Contact us at <a href="mailto:bdh.alumni@abg.edu.vn?subject=Premium Upgrade Request" style="color:#7c3aed;text-decoration:underline;">bdh.alumni@abg.edu.vn</a> to upgrade.</p>
          </div>
          <p style="margin:0;font-size:15px;color:#374151;">Best regards,<br><strong>ABG Alumni Connect</strong></p>
        </td></tr>
        <tr><td style="padding:24px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">ABG Alumni Community</p>
        </td></tr>
      </table>
    </td></tr>
  </table></body>`,
  });

  // 3. Premium Upgrade (NEW)
  emails.push({
    name: '3. Premium Upgrade',
    subject: "[TEST] You've been upgraded to Premium - ABG Alumni Connect",
    html: `<body style="margin:0;padding:0;background:#f4f4f7;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr><td style="background:linear-gradient(135deg,#7c3aed,#2563eb);padding:28px 40px;">
          <h1 style="margin:0;font-size:22px;color:#fff;font-weight:600;">ABG Alumni Connect</h1>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#1f2937;">Hi <strong>Nguyễn Văn Test</strong>,</p>
          <div style="background:#f5f3ff;border:1px solid #c4b5fd;border-radius:10px;padding:20px;margin:0 0 24px;text-align:center;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#7c3aed;text-transform:uppercase;letter-spacing:0.05em;">Your membership</p>
            <p style="margin:0;font-size:24px;font-weight:700;color:#5b21b6;">Premium Member</p>
          </div>
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">Congratulations! Your account has been upgraded to <strong>Premium</strong>. You now have access to all premium features:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr><td style="padding:8px 0;font-size:15px;color:#374151;">&#10003; Up to 50 connection requests per month</td></tr>
            <tr><td style="padding:8px 0;font-size:15px;color:#374151;">&#10003; See full member profiles (name, phone, LinkedIn)</td></tr>
            <tr><td style="padding:8px 0;font-size:15px;color:#374151;">&#10003; Up to 10 AI-powered matches per request</td></tr>
            <tr><td style="padding:8px 0;font-size:15px;color:#374151;">&#10003; Priority matching and support</td></tr>
          </table>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;">Start exploring the ABG Alumni network and find the connections you're looking for!</p>
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
            <a href="${APP_URL}/request" style="display:inline-block;padding:14px 48px;background:#7c3aed;color:#fff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">Start Finding Connections</a>
          </td></tr></table>
        </td></tr>
        <tr><td style="padding:24px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">Best regards,<br><strong>ABG Alumni Connect</strong></p>
        </td></tr>
      </table>
    </td></tr>
  </table></body>`,
  });

  // 4. Contact Request (Job/Recruitment)
  emails.push({
    name: '4. Contact Request (Job/Recruitment)',
    subject: '[TEST] [ABG Connect] Trần Minh Hiring muốn kết nối với bạn',
    html: `<body style="margin:0;padding:0;background:#f4f4f7;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr><td style="background:#1a56db;padding:28px 40px;">
          <h1 style="margin:0;font-size:22px;color:#fff;font-weight:600;">ABG Alumni Connect</h1>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#1f2937;">Xin chào <strong>Nguyễn Văn Test</strong>,</p>
          <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">Bạn vừa nhận được một yêu cầu kết nối từ một thành viên trong cộng đồng ABG Alumni:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin:0 0 20px;">
            <tr><td style="padding:16px 20px;">
              <p style="margin:0 0 4px;font-size:17px;font-weight:600;color:#1e40af;">Trần Minh Hiring</p>
              <p style="margin:0;font-size:14px;color:#6b7280;">HR Director tại VNG Corporation</p>
            </td></tr>
          </table>
          <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#374151;">Lời nhắn từ Trần Minh Hiring:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border-left:4px solid #1a56db;border-radius:0 8px 8px 0;margin:0 0 24px;">
            <tr><td style="padding:14px 18px;">
              <p style="margin:0;font-size:15px;color:#1e3a5f;line-height:1.6;">Chào bạn, mình đang tìm Senior Backend Engineer cho team Payment. Profile bạn rất phù hợp, mình muốn trao đổi thêm.</p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;margin:0 0 28px;">
            <tr><td style="padding:12px 16px;">
              <p style="margin:0;font-size:13px;color:#92400e;line-height:1.5;">🔒 <strong>Quyền riêng tư:</strong> Thông tin liên hệ của bạn sẽ <strong>chỉ được chia sẻ khi bạn chấp nhận</strong> yêu cầu này.</p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:0 0 12px;">
              <a href="${APP_URL}/api/contact/respond?token=test-token&action=accept" style="display:inline-block;padding:14px 48px;background:#16a34a;color:#fff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">Chấp nhận kết nối</a>
            </td></tr>
            <tr><td align="center">
              <a href="${APP_URL}/api/contact/respond?token=test-token&action=decline" style="display:inline-block;padding:10px 36px;background:#fff;color:#6b7280;font-size:14px;font-weight:500;text-decoration:none;border-radius:8px;border:1px solid #d1d5db;">Từ chối</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">Email này được gửi từ nền tảng ABG Alumni Connect.</p>
        </td></tr>
      </table>
    </td></tr>
  </table></body>`,
  });

  // 5. Contact Accepted — email to REQUESTER (sees the other party's info)
  const buildCard = (name: string, role: string, company: string, email: string, phone: string, linkedin: string) => `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;margin:0 0 24px;">
      <tr><td style="padding:20px 24px;">
        <p style="margin:0 0 4px;font-size:18px;font-weight:700;color:#166534;">${escapeHtml(name)}</p>
        <p style="margin:0 0 16px;font-size:14px;color:#4b5563;">${escapeHtml(role)} tại ${escapeHtml(company)}</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:8px 0;border-bottom:1px solid #dcfce7;"><span style="font-size:13px;color:#6b7280;">📧 Email</span><br><a href="mailto:${email}" style="font-size:15px;color:#1e40af;text-decoration:none;">${escapeHtml(email)}</a></td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #dcfce7;"><span style="font-size:13px;color:#6b7280;">📱 Điện thoại</span><br><a href="tel:${phone}" style="font-size:15px;color:#1e40af;text-decoration:none;">${escapeHtml(phone)}</a></td></tr>
          <tr><td style="padding:8px 0;"><span style="font-size:13px;color:#6b7280;">💼 LinkedIn</span><br><a href="${linkedin}" style="font-size:15px;color:#1e40af;text-decoration:none;">${escapeHtml(linkedin)}</a></td></tr>
        </table>
      </td></tr>
    </table>`;

  const acceptBodyFor = (recipientName: string, otherName: string, otherCard: string) => `
<body style="margin:0;padding:0;background:#f4f4f7;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr><td style="background:#16a34a;padding:28px 40px;">
          <h1 style="margin:0;font-size:22px;color:#fff;font-weight:600;">ABG Alumni Connect</h1>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#1f2937;">Xin chào <strong>${escapeHtml(recipientName)}</strong>,</p>
          <p style="margin:0 0 8px;font-size:15px;color:#374151;line-height:1.6;">Tin vui! Kết nối giữa bạn và <strong>${escapeHtml(otherName)}</strong> đã được xác nhận.</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">Dưới đây là thông tin liên hệ đầy đủ để bạn có thể bắt đầu kết nối:</p>
          ${otherCard}
          <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">Hãy chủ động liên hệ và bắt đầu kết nối nhé! Chúc bạn có những cuộc trò chuyện thú vị.</p>
        </td></tr>
        <tr><td style="padding:24px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">Trân trọng,<br><strong>ABG Alumni Connect</strong></p>
        </td></tr>
      </table>
    </td></tr>
  </table></body>`;

  // 5a. Accepted — email to REQUESTER (sees acceptor's info)
  emails.push({
    name: '5a. Contact Accepted → Requester sees Acceptor info',
    subject: '[TEST] [ABG Connect] Kết nối với Nguyễn Văn Test đã được xác nhận',
    html: acceptBodyFor(
      'Trần Minh Hiring',
      'Nguyễn Văn Test',
      buildCard('Nguyễn Văn Test', 'Senior Backend Engineer', 'FPT Software', 'test@example.com', '+84 912 345 678', 'https://linkedin.com/in/nguyenvantest')
    ),
  });

  // 5b. Accepted — email to ACCEPTOR (sees requester's info)
  emails.push({
    name: '5b. Contact Accepted → Acceptor sees Requester info',
    subject: '[TEST] [ABG Connect] Kết nối với Trần Minh Hiring đã được xác nhận',
    html: acceptBodyFor(
      'Nguyễn Văn Test',
      'Trần Minh Hiring',
      buildCard('Trần Minh Hiring', 'HR Director', 'VNG Corporation', 'hiring@example.com', '+84 987 654 321', 'https://linkedin.com/in/tranminhhiring')
    ),
  });

  // 6. Contact Declined (with name)
  emails.push({
    name: '6. Contact Declined (names the person)',
    subject: '[TEST] [ABG Connect] Cập nhật yêu cầu kết nối với Nguyễn Văn Test',
    html: `<body style="margin:0;padding:0;background:#f4f4f7;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr><td style="background:#1a56db;padding:28px 40px;">
          <h1 style="margin:0;font-size:22px;color:#fff;font-weight:600;">ABG Alumni Connect</h1>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#1f2937;">Xin chào <strong>Trần Minh Hiring</strong>,</p>
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">Cảm ơn bạn đã sử dụng ABG Alumni Connect. Rất tiếc, yêu cầu kết nối của bạn với <strong>Nguyễn Văn Test</strong> hiện chưa được chấp nhận vào lúc này.</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">Đừng lo, cộng đồng ABG Alumni có rất nhiều thành viên tài năng khác đang chờ kết nối với bạn. Hãy tiếp tục khám phá và tìm kiếm những cơ hội mới!</p>
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
            <a href="${APP_URL}/request" style="display:inline-block;padding:12px 36px;background:#1a56db;color:#fff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">Tìm kết nối mới</a>
          </td></tr></table>
        </td></tr>
        <tr><td style="padding:24px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">Trân trọng,<br><strong>ABG Alumni Connect</strong></p>
        </td></tr>
      </table>
    </td></tr>
  </table></body>`,
  });

  // 7. Love Match Notification (anonymous)
  emails.push({
    name: '7. Love Match Notification (anonymous)',
    subject: '[TEST] Someone is interested in connecting with you on ABG Connect',
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <h1 style="color:#ec4899;border-bottom:2px solid #ec4899;padding-bottom:16px;">ABG Alumni Connect</h1>
      <h2>Someone wants to connect with you!</h2>
      <p>A fellow ABG alumni has expressed interest in connecting with you. Here's a glimpse:</p>
      <div style="background:#fdf2f8;border-left:4px solid #ec4899;padding:12px 16px;margin:16px 0;border-radius:4px;">
        <div style="font-size:12px;font-weight:600;color:#9d174d;text-transform:uppercase;">About them</div>
        A creative soul who loves travel, photography, and Vietnamese coffee.
      </div>
      <div style="background:#fdf2f8;border-left:4px solid #ec4899;padding:12px 16px;margin:16px 0;border-radius:4px;">
        <div style="font-size:12px;font-weight:600;color:#9d174d;text-transform:uppercase;">Interests</div>
        Hiking, art, cooking, tech startups
      </div>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:12px;margin:16px 0;font-size:14px;color:#166534;">
        Their real name, contact info, and employer are kept private until you accept.
      </div>
      <a href="${APP_URL}/love-match" style="display:inline-block;background:#ec4899;color:white;padding:12px 28px;text-decoration:none;border-radius:6px;margin:20px 0;font-weight:600;">View & Respond</a>
      <p>Best regards,<br>ABG Alumni Connect</p>
    </div>`,
  });

  // 8. Application Rejected
  emails.push({
    name: '8. Application Rejected',
    subject: '[TEST] ABG Alumni Connect - Application Update',
    html: `<body style="margin:0;padding:0;background:#f4f4f7;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr><td style="background:#1a56db;padding:28px 40px;">
          <h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:600;">ABG Alumni Connect</h1>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#1f2937;">Hi <strong>Nguyễn Văn Test</strong>,</p>
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">Thank you for your interest in ABG Alumni Connect.</p>
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">After reviewing your application, we were unable to verify your information against our ABG class records. This may happen if:</p>
          <ul style="margin:0 0 16px;padding-left:20px;font-size:15px;color:#374151;line-height:1.8;">
            <li>Your registered email does not match our alumni database</li>
            <li>The class name you provided does not match any ABG program</li>
            <li>Your name could not be found in the selected class roster</li>
          </ul>
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:0 0 16px;">
            <p style="margin:0;font-size:14px;color:#92400e;line-height:1.6;"><strong>Think this is a mistake?</strong> Please double-check your class name and re-apply, or contact us with your correct ABG class details so we can verify manually.</p>
          </div>
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">Reach out to us at <a href="mailto:bdh.alumni@abg.edu.vn?subject=Membership Application Inquiry" style="color:#1a56db;text-decoration:underline;">bdh.alumni@abg.edu.vn</a> and we'll be happy to help.</p>
          <p style="margin:0;font-size:15px;color:#374151;">Best regards,<br><strong>ABG Alumni Connect</strong></p>
        </td></tr>
        <tr><td style="padding:24px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">ABG Alumni Community</p>
        </td></tr>
      </table>
    </td></tr>
  </table></body>`,
  });

  // Send all emails
  console.log(`\nSending ${emails.length} test emails to ${TO_EMAIL}...\n`);

  for (const email of emails) {
    try {
      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: TO_EMAIL,
        subject: email.subject,
        html: email.html,
      });
      if (error) {
        console.log(`❌ ${email.name}: ${error.message}`);
      } else {
        console.log(`✅ ${email.name}`);
      }
    } catch (e) {
      console.log(`❌ ${email.name}: ${(e as Error).message}`);
    }
    // Small delay between sends to avoid rate limiting
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\nDone! Check your inbox at', TO_EMAIL);
}

main().catch(console.error);
