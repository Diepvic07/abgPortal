import { describe, expect, it } from 'vitest';
import { normalizeMeetingLink } from '@/lib/meeting-link';

describe('normalizeMeetingLink', () => {
  it('accepts Google Meet links', () => {
    expect(normalizeMeetingLink('https://meet.google.com/abc-defg-hij')).toBe('https://meet.google.com/abc-defg-hij');
  });

  it('accepts Zoom links with query params', () => {
    const url = 'https://zoom.us/j/123456789?pwd=abc';
    expect(normalizeMeetingLink(url)).toBe(url);
  });

  it('accepts Microsoft Teams links with long paths', () => {
    const url = 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_abc%40thread.v2/0?context=%7b%7d';
    expect(normalizeMeetingLink(url)).toBe(url);
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeMeetingLink('  https://zoom.us/j/123  ')).toBe('https://zoom.us/j/123');
  });

  it('rejects missing schemes', () => {
    expect(normalizeMeetingLink('meet.google.com/abc-defg-hij')).toBeNull();
  });

  it('rejects non-HTTPS URLs', () => {
    expect(normalizeMeetingLink('http://zoom.us/j/123')).toBeNull();
  });

  it('rejects unsafe schemes', () => {
    expect(normalizeMeetingLink('javascript:alert(1)')).toBeNull();
  });

  it('rejects malformed strings', () => {
    expect(normalizeMeetingLink('not a url')).toBeNull();
  });
});
