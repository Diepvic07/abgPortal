import { v4 as uuid } from 'uuid';

export type RequestCategory = 'love' | 'job' | 'hiring' | 'partner';
export type NewsCategory = 'Edu' | 'Business' | 'Event' | 'Course' | 'Announcement';

export interface TestMember {
  id: string;
  name: string;
  email: string;
  chapter: string;
  bio: string;
  industry: string;
  tier: 'basic' | 'premium';
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  role?: string;
  company?: string;
  gender?: 'Male' | 'Female' | 'Undisclosed';
  relationship_status?: string;
  nickname?: string;
  country?: string;
  self_description?: string;
  interests?: string;
  core_values?: string;
  ideal_day?: string;
  paid?: boolean;
  free_requests_used?: number;
  requests_this_month?: number;
  requests_today?: number;
  month_reset_date?: string;
  dating_profile_complete?: boolean;
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

export function createDatingMember(overrides: Partial<TestMember> = {}): TestMember {
  return createTestMember({
    gender: 'Male',
    relationship_status: 'Single',
    nickname: 'StarGazer',
    country: 'Vietnam',
    self_description: 'Creative, Adventurous, Thoughtful',
    interests: 'Hiking, Photography, Cooking',
    core_values: 'Honesty, Growth, Compassion',
    ideal_day: 'Morning hike followed by a cozy brunch and evening stargazing.',
    dating_profile_complete: true,
    ...overrides,
  });
}

export interface TestMatchRequest {
  purpose: string;
  requesterId: string;
  category?: RequestCategory;
}

export function createTestRequest(requesterId: string, category?: RequestCategory): TestMatchRequest {
  return {
    purpose: 'Looking for mentorship in tech leadership.',
    requesterId,
    category,
  };
}

export interface TestNewsArticle {
  id: string;
  title: string;
  slug: string;
  category: NewsCategory;
  excerpt: string;
  content: string;
  image_url?: string;
  author_name: string;
  published_date: string;
  is_published_vi: boolean;
  is_published_en: boolean;
  is_featured: boolean;
  created_at: string;
}

export function createTestArticle(overrides: Partial<TestNewsArticle> = {}): TestNewsArticle {
  const id = uuid().slice(0, 8);
  return {
    id,
    title: `Test Article ${id}`,
    slug: `test-article-${id}`,
    category: 'Edu',
    excerpt: 'A brief summary of the test article for preview cards.',
    content: '## Hello World\n\nThis is **bold** and *italic* content.\n\n- Item 1\n- Item 2\n\n```js\nconsole.log("test");\n```',
    image_url: 'https://via.placeholder.com/800x400',
    author_name: 'Test Author',
    published_date: new Date().toISOString(),
    is_published_vi: true,
    is_published_en: true,
    is_featured: false,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export interface TestLoveMatchRequest {
  id: string;
  request_id: string;
  from_id: string;
  to_id: string;
  status: 'pending' | 'accepted' | 'refused' | 'ignored';
  from_profile_shared: string;
  to_profile_shared?: string;
  viewed_at?: string;
  resolved_at?: string;
  created_at: string;
}

export function createTestLoveMatch(overrides: Partial<TestLoveMatchRequest> = {}): TestLoveMatchRequest {
  const id = uuid().slice(0, 8);
  return {
    id,
    request_id: `req-${id}`,
    from_id: `from-${id}`,
    to_id: `to-${id}`,
    status: 'pending',
    from_profile_shared: JSON.stringify({
      nickname: 'StarGazer',
      gender: 'Male',
      country: 'Vietnam',
      self_description: 'Creative, Adventurous, Thoughtful',
      interests: 'Hiking, Photography, Cooking',
      core_values: 'Honesty, Growth, Compassion',
      ideal_day: 'Morning hike followed by a cozy brunch.',
    }),
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export interface TestMatch {
  id: string;
  reason: string;
  match_score: number;
  member: {
    id: string;
    name: string;
    role: string;
    company: string;
    bio: string;
    expertise: string;
  };
}

export function createTestMatch(id: string, name: string, score: number = 85): TestMatch {
  return {
    id,
    reason: `Strong match for ${name}`,
    match_score: score,
    member: { id, name, role: 'Engineer', company: 'TechCo', bio: `Bio of ${name}`, expertise: 'JS,Python' },
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
