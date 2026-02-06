import { v4 as uuid } from 'uuid';

export interface TestMember {
  id: string;
  name: string;
  email: string;
  chapter: string;
  bio: string;
  industry: string;
  tier: 'basic' | 'premium';
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
}

export function createTestMember(overrides: Partial<TestMember> = {}): TestMember {
  const id = uuid().slice(0, 8);
  return {
    id,
    name: `Test User ${id}`,
    email: `test-${id}@abgalumni.test`,
    chapter: 'San Francisco',
    bio: 'A passionate professional seeking meaningful connections.',
    industry: 'Technology',
    tier: 'basic',
    status: 'approved',
    ...overrides,
  };
}

export function createTestAdmin(): TestMember {
  return createTestMember({
    email: 'admin@abgalumni.test',
    name: 'Test Admin',
    tier: 'premium',
  });
}

export function createPendingMember(): TestMember {
  return createTestMember({ status: 'pending' });
}

export interface TestMatchRequest {
  purpose: string;
  requesterId: string;
}

export function createTestRequest(requesterId: string): TestMatchRequest {
  return {
    purpose: 'Looking for mentorship in tech leadership.',
    requesterId,
  };
}

// Mock API response shapes
export const mockSheetResponses = {
  emptySheet: { values: [] },
  singleMember: (member: TestMember) => ({
    values: [[member.id, member.name, member.email, member.chapter, member.bio]],
  }),
  memberList: (members: TestMember[]) => ({
    values: members.map((m) => [m.id, m.name, m.email, m.chapter, m.bio]),
  }),
};

export const mockGeminiResponses = {
  generatedBio: {
    candidates: [
      {
        content: {
          parts: [
            {
              text: 'A dynamic professional with expertise in building scalable systems and mentoring teams.',
            },
          ],
        },
      },
    ],
  },
  matchResults: (members: TestMember[]) => ({
    candidates: [
      {
        content: {
          parts: [
            {
              text: JSON.stringify(
                members.slice(0, 3).map((m) => ({ id: m.id, score: 0.85 }))
              ),
            },
          ],
        },
      },
    ],
  }),
};

export const mockResendResponses = {
  success: {
    id: `email-${uuid()}`,
    from: 'noreply@abgalumni.org',
    created_at: new Date().toISOString(),
  },
};
