const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL!;

type NotificationType = 'new_member' | 'new_request' | 'connection_made' | 'abuse_detected' | 'new_signup';

interface NotificationData {
  name?: string;
  email?: string;
  role?: string;
  company?: string;
  requester_name?: string;
  request_text?: string;
  from_name?: string;
  to_name?: string;
}

export async function notifyAdmin(
  type: NotificationType,
  data: NotificationData
): Promise<void> {
  if (!WEBHOOK_URL) {
    console.warn('Discord webhook URL not configured');
    return;
  }

  const embeds: Record<NotificationType, object> = {
    new_member: {
      title: 'New Member Onboarded',
      color: 0x28a745,
      fields: [
        { name: 'Name', value: data.name || 'N/A', inline: true },
        { name: 'Email', value: data.email || 'N/A', inline: true },
        { name: 'Role', value: `${data.role} at ${data.company}`, inline: false },
      ],
      timestamp: new Date().toISOString(),
    },
    new_request: {
      title: 'New Connection Request',
      color: 0x007bff,
      fields: [
        { name: 'From', value: data.requester_name || 'N/A', inline: true },
        { name: 'Need', value: (data.request_text || '').slice(0, 200) + (data.request_text && data.request_text.length > 200 ? '...' : ''), inline: false },
      ],
      timestamp: new Date().toISOString(),
    },
    connection_made: {
      title: 'Connection Made!',
      color: 0xffc107,
      fields: [
        { name: 'Requester', value: data.from_name || 'N/A', inline: true },
        { name: 'Matched With', value: data.to_name || 'N/A', inline: true },
      ],
      timestamp: new Date().toISOString(),
    },
    abuse_detected: {
      title: '⚠️ Abuse Detected',
      color: 0xdc3545, // Red
      fields: [
        { name: 'User', value: data.requester_name || 'N/A', inline: true },
        { name: 'Alert', value: data.request_text || 'N/A', inline: false },
      ],
      timestamp: new Date().toISOString(),
    },
    new_signup: {
      title: '📝 New Signup Request',
      color: 0x9333ea, // Purple
      fields: [
        { name: 'Name', value: data.name || 'N/A', inline: true },
        { name: 'Email', value: data.email || 'N/A', inline: true },
        { name: 'Role', value: `${data.role || 'N/A'} at ${data.company || 'N/A'}`, inline: false },
      ],
      description: '⏳ Needs approval in admin dashboard',
      timestamp: new Date().toISOString(),
    },
  };

  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [embeds[type]],
      }),
    });
  } catch (error) {
    console.error('Discord webhook failed:', error);
  }
}
