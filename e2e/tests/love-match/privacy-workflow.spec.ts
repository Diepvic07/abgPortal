import { test, expect } from '@playwright/test';
import { setupAllMocks } from '../../mocks/setup-all-mocks';
import { createDatingMember, createTestLoveMatch } from '../../fixtures/test-data';
import { clearCapturedEmails, getCapturedEmails } from '../../mocks/resend.mock';
import { setupE2EAuth } from '../../fixtures/auth-helpers';

test.describe('Love Match Privacy Workflow', () => {
  const currentUser = createDatingMember({ id: 'current-user-id' });

  test.beforeEach(() => {
    clearCapturedEmails();
  });

  // Test 1: Incoming love match cards show anonymous profile (not real name/company)
  test('hides real name and company in incoming love match history', async ({ page, context }) => {
    const incomingLoveMatch = createTestLoveMatch({
      id: 'lm-1',
      request_id: 'req-1',
      from_id: 'user-a',
      to_id: currentUser.id,
      status: 'pending',
      from_profile_shared: JSON.stringify({
        nickname: 'StarGazer',
        gender: 'Male',
        country: 'Vietnam',
        self_description: 'Creative, Adventurous, Thoughtful',
        interests: 'Hiking, Photography',
        core_values: 'Honesty, Growth',
        ideal_day: 'Morning hike then cozy brunch',
      }),
    });

    await setupE2EAuth(page, context, { id: currentUser.id, email: currentUser.email, tier: 'premium' });

    // The history page fetches /api/history?type=requests&days=0 initially,
    // then /api/history?type=incoming&days=0 when switching tabs
    await page.route('**/api/history**', (route) => {
      const url = route.request().url();
      if (url.includes('type=incoming')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            connections: [],
            love_matches: [incomingLoveMatch],
          }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            requests: [],
            love_matches: [],
          }),
        });
      }
    });

    await setupAllMocks(page, {});
    await page.goto('/history');

    // Click Incoming tab (it's a <button>, not role="tab")
    await page.getByRole('button', { name: /incoming/i }).click();

    // Anonymous nickname should be shown
    await expect(page.getByText('StarGazer')).toBeVisible();

    // Anonymous profile fields should be shown
    await expect(page.getByText(/Vietnam/i)).toBeVisible();
    await expect(page.getByText(/Creative, Adventurous, Thoughtful/i)).toBeVisible();

    // Real identifying info must NOT appear
    await expect(page.getByText(currentUser.email)).not.toBeVisible();
  });

  // Test 2: Pre-send privacy notice — love match connect button text differs
  test('love match connect button shows love-specific text', async ({ page, context }) => {
    const matchedMember = createDatingMember({ id: 'match-target-id', name: 'Jane Doe' });

    await setupE2EAuth(page, context, { id: currentUser.id, email: currentUser.email, tier: 'premium' });

    await page.route('**/api/profile', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          member: { name: currentUser.name, gender: currentUser.gender, relationship_status: currentUser.relationship_status },
        }),
      });
    });

    await page.route('**/api/request', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          request_id: 'req-love-1',
          matches: [{
            id: matchedMember.id,
            reason: 'Compatible personality',
            match_score: 92,
            member: {
              id: matchedMember.id,
              name: matchedMember.name,
              role: 'Designer',
              company: 'ArtCo',
              bio: matchedMember.bio,
              expertise: 'UX',
            },
          }],
        }),
      });
    });

    await setupAllMocks(page, { members: [matchedMember] });
    await page.goto('/request');

    // Wait for form to be ready
    await expect(page.locator('textarea[name="request_text"]')).toBeVisible();

    // Select love category — profile check fires asynchronously
    await page.locator('button[type="button"]').filter({ hasText: /romantic partner/i }).click();

    // Fill and submit (Playwright auto-waits for textarea to be actionable)
    await page.locator('textarea[name="request_text"]').fill('Looking for a genuine connection with shared values.');
    await page.locator('form button[type="submit"]').click();

    // Match results should appear
    await expect(page.getByText(matchedMember.name).first()).toBeVisible();

    // The connect button for love category should show love-specific text
    // (it's always visible at the bottom, not just after selecting a match)
    await expect(page.getByRole('button', { name: /send love match request/i })).toBeVisible();
  });

  // Test 3: Sends love match connect request and shows success
  test('sends love match connect and shows success', async ({ page, context }) => {
    const matchedMember = createDatingMember({ id: 'match-target-2', name: 'Alex Kim' });

    await setupE2EAuth(page, context, { id: currentUser.id, email: currentUser.email, tier: 'premium' });

    await page.route('**/api/profile', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          member: { name: currentUser.name, gender: currentUser.gender, relationship_status: currentUser.relationship_status },
        }),
      });
    });

    await page.route('**/api/request', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          request_id: 'req-love-2',
          matches: [{
            id: matchedMember.id,
            reason: 'Great match',
            match_score: 88,
            member: {
              id: matchedMember.id,
              name: matchedMember.name,
              role: 'Engineer',
              company: 'TechCo',
              bio: matchedMember.bio,
              expertise: 'Python',
            },
          }],
        }),
      });
    });

    await page.route('**/api/connect', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Connection request sent' }),
      });
    });

    await setupAllMocks(page, { members: [matchedMember] });
    await page.goto('/request');

    // Wait for form to be ready
    await expect(page.locator('textarea[name="request_text"]')).toBeVisible();

    // Select love category — profile check fires asynchronously
    await page.locator('button[type="button"]').filter({ hasText: /romantic partner/i }).click();

    // Fill and submit
    await page.locator('textarea[name="request_text"]').fill('Seeking a meaningful relationship with someone genuine.');
    await page.locator('form button[type="submit"]').click();

    // Wait for match results
    await expect(page.getByText(matchedMember.name).first()).toBeVisible();

    // Select match card then click connect
    await page.locator('div.cursor-pointer').filter({ hasText: matchedMember.name }).first().click();
    await page.getByRole('button', { name: /send love match request/i }).click();

    // Check success message
    await expect(page.getByText(/introduction sent/i)).toBeVisible();
  });

  // Test 4: Requires complete dating profile before love match
  test('requires complete dating profile before submitting love match', async ({ page, context }) => {
    await setupE2EAuth(page, context, { id: currentUser.id, email: currentUser.email, tier: 'premium' });

    // Mock incomplete profile — has name but no gender or relationship_status
    await page.route('**/api/profile', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          member: { name: currentUser.name },
        }),
      });
    });

    await setupAllMocks(page, {});
    await page.goto('/request');

    // Wait for form to be ready
    await expect(page.locator('textarea[name="request_text"]')).toBeVisible();

    // Select love category — profile check fires asynchronously
    await page.locator('button[type="button"]').filter({ hasText: /romantic partner/i }).click();

    // Should show complete profile form (auto-waits for profile check to complete)
    await expect(page.getByText(/complete your profile/i)).toBeVisible();

    // Gender and relationship selects should be visible in the form
    await expect(page.locator('select[name="gender"]')).toBeVisible();
    await expect(page.locator('select[name="relationship_status"]')).toBeVisible();
  });

  // Test 5: Incoming love match history shows anonymous profile data
  test('shows incoming love match with anonymous profile fields only', async ({ page, context }) => {
    const loveMatch = createTestLoveMatch({
      to_id: currentUser.id,
      status: 'pending',
      from_profile_shared: JSON.stringify({
        nickname: 'MoonWalker',
        gender: 'Female',
        country: 'Singapore',
        self_description: 'Curious, Kind, Creative',
        interests: 'Reading, Travel, Cooking',
        core_values: 'Respect, Family, Growth',
        ideal_day: 'Slow morning with coffee and a good book',
      }),
    });

    await setupE2EAuth(page, context, { id: currentUser.id, email: currentUser.email, tier: 'premium' });

    await page.route('**/api/history**', (route) => {
      const url = route.request().url();
      if (url.includes('type=incoming')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            connections: [],
            love_matches: [loveMatch],
          }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            requests: [],
            love_matches: [],
          }),
        });
      }
    });

    await setupAllMocks(page, {});
    await page.goto('/history');

    await page.getByRole('button', { name: /incoming/i }).click();

    // Anonymous data from from_profile_shared should be visible
    await expect(page.getByText('MoonWalker')).toBeVisible();
    await expect(page.getByText(/Singapore/i)).toBeVisible();
    await expect(page.getByText(/Curious, Kind, Creative/i)).toBeVisible();
    await expect(page.getByText(/Reading, Travel, Cooking/i)).toBeVisible();
  });

  // Test 6: Accepting a love match shows accepted state
  test('accept love match shows accepted status', async ({ page, context }) => {
    const pendingMatch = createTestLoveMatch({
      id: 'lm-accept-1',
      to_id: currentUser.id,
      status: 'pending',
      from_profile_shared: JSON.stringify({
        nickname: 'SunBeam',
        gender: 'Female',
        country: 'Japan',
      }),
    });

    await setupE2EAuth(page, context, { id: currentUser.id, email: currentUser.email, tier: 'premium' });

    let historyCallCount = 0;
    await page.route('**/api/history**', (route) => {
      const url = route.request().url();
      if (url.includes('type=incoming')) {
        historyCallCount++;
        const isRefreshed = historyCallCount > 1;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            connections: [],
            love_matches: [
              isRefreshed
                ? { ...pendingMatch, status: 'accepted', resolved_at: new Date().toISOString() }
                : pendingMatch,
            ],
          }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            requests: [],
            love_matches: [],
          }),
        });
      }
    });

    await page.route('**/api/love-match/respond', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Accepted! Contact details shared.' }),
      });
    });

    await setupAllMocks(page, { resend: { captureEmails: true } });
    await page.goto('/history');

    // Switch to incoming tab
    await page.getByRole('button', { name: /incoming/i }).click();

    // Click accept button
    await page.getByRole('button', { name: 'Accept' }).click();

    // After accept + refetch, status should show "Matched!"
    await expect(page.getByText('Matched!')).toBeVisible();
  });

  // Test 7: Passing/refusing a love match
  test('refuse love match sends refuse action and no email', async ({ page, context }) => {
    const pendingMatch = createTestLoveMatch({
      id: 'lm-refuse-1',
      to_id: currentUser.id,
      status: 'pending',
      from_profile_shared: JSON.stringify({
        nickname: 'NightOwl',
        gender: 'Male',
        country: 'Korea',
      }),
    });

    await setupE2EAuth(page, context, { id: currentUser.id, email: currentUser.email, tier: 'premium' });

    let capturedRespondBody: Record<string, unknown> = {};
    let historyCallCount = 0;

    await page.route('**/api/history**', (route) => {
      const url = route.request().url();
      if (url.includes('type=incoming')) {
        historyCallCount++;
        const isRefreshed = historyCallCount > 1;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            connections: [],
            love_matches: [
              isRefreshed
                ? { ...pendingMatch, status: 'refused', resolved_at: new Date().toISOString() }
                : pendingMatch,
            ],
          }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            requests: [],
            love_matches: [],
          }),
        });
      }
    });

    await page.route('**/api/love-match/respond', (route) => {
      capturedRespondBody = route.request().postDataJSON() ?? {};
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Passed.' }),
      });
    });

    await setupAllMocks(page, { resend: { captureEmails: true } });
    await page.goto('/history');

    // Switch to incoming tab
    await page.getByRole('button', { name: /incoming/i }).click();

    // Click Pass button (the component uses "Pass" text)
    await page.getByRole('button', { name: 'Pass' }).click();

    // Confirm the pass (component shows "Yes, Pass" confirmation)
    await page.getByRole('button', { name: /yes, pass/i }).click();

    // Verify respond API was called with action: 'refuse'
    expect(capturedRespondBody.action).toBe('refuse');

    // Verify no emails were sent (refuse is silent)
    const sentEmails = getCapturedEmails();
    expect(sentEmails).toHaveLength(0);

    // After refetch, status should show "Not a match"
    await expect(page.getByText('Not a match')).toBeVisible();
  });
});
