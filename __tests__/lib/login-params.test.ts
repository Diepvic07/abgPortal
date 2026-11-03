import { describe, expect, it } from 'vitest';
import { normalizeLoginEmail, safeLoginCallbackUrl } from '@/lib/login-params';

describe('login query parameters', () => {
  it('normalizes a valid email for prefill', () => {
    expect(normalizeLoginEmail('  Student.Name@Example.COM  ')).toBe('student.name@example.com');
  });

  it.each(['not-an-email', 'user@localhost', 'a'.repeat(250) + '@x.com', '']) (
    'ignores invalid email %j', (email) => {
      expect(normalizeLoginEmail(email)).toBeUndefined();
    }
  );

  it('refuses an external callback URL', () => {
    expect(safeLoginCallbackUrl('https://evil.example/path')).toBe('/events');
    expect(safeLoginCallbackUrl('//evil.example/path')).toBe('/events');
    expect(safeLoginCallbackUrl('/dashboard?tab=people')).toBe('/dashboard?tab=people');
  });

  it('ignores repeated query parameters instead of throwing', () => {
    expect(normalizeLoginEmail(['valid@example.com', 'attacker@example.com'])).toBeUndefined();
    expect(safeLoginCallbackUrl(['/dashboard', 'https://evil.example'])).toBe('/events');
  });
});
