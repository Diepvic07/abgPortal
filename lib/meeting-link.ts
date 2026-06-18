export type MeetingPlatform = 'meet' | 'zoom' | 'other';

export function normalizeMeetingLink(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:') return null;
    return trimmed;
  } catch {
    return null;
  }
}

export function normalizeMeetingPlatform(value: unknown): MeetingPlatform {
  return value === 'zoom' || value === 'other' ? value : 'meet';
}

export interface MeetingPlatformEmailLabels {
  meetingPlatformLabel: string;
  joinButtonLabel: string;
  calendarDescriptionLabel: string;
}

export function getMeetingPlatformEmailLabels(
  platform: MeetingPlatform,
  locale: 'vi' | 'en' = 'vi',
): MeetingPlatformEmailLabels {
  const isVi = locale === 'vi';

  if (platform === 'zoom') {
    return {
      meetingPlatformLabel: 'Zoom',
      joinButtonLabel: isVi ? 'Tham gia Zoom' : 'Join Zoom',
      calendarDescriptionLabel: isVi ? 'Tham gia Zoom' : 'Join Zoom',
    };
  }

  if (platform === 'other') {
    return {
      meetingPlatformLabel: isVi ? 'Link tham gia' : 'Meeting link',
      joinButtonLabel: isVi ? 'Tham gia buổi họp' : 'Join meeting',
      calendarDescriptionLabel: isVi ? 'Tham gia buổi họp' : 'Join meeting',
    };
  }

  return {
    meetingPlatformLabel: 'Google Meet',
    joinButtonLabel: isVi ? 'Tham gia Google Meet' : 'Join Google Meet',
    calendarDescriptionLabel: isVi ? 'Tham gia Google Meet' : 'Join Google Meet',
  };
}
