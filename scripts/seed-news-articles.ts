/**
 * Seed script: Adds sample news articles to Google Sheets News tab.
 * Usage: npx tsx scripts/seed-news-articles.ts
 */
import dotenv from 'dotenv';
import path from 'path';
import { google } from 'googleapis';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID!;
const SHEET_NAME = 'News';

// Columns: id, title, slug, category, excerpt, content (markdown), image_url, author_name, published_date, is_published, is_featured, created_at
const now = new Date().toISOString();

const articles = [
  [
    'news-001',
    'ABG Alumni Network Surpasses 5,000 Members Across Southeast Asia',
    'abg-alumni-network-surpasses-5000-members',
    'Announcement',
    'A milestone celebration as our alumni community reaches 5,000 active members spanning 8 countries in the region.',
    `## A Growing Community\n\nWe're thrilled to announce that the **ABG Alumni Network** has officially surpassed **5,000 active members** across Southeast Asia!\n\nThis milestone reflects the incredible energy and commitment of our alumni community, spanning chapters in:\n\n- Vietnam\n- Singapore\n- Indonesia\n- Thailand\n- Philippines\n- Malaysia\n- Myanmar\n- Cambodia\n\n### What This Means\n\nWith 5,000+ professionals now connected through our platform, the opportunities for mentorship, collaboration, and career growth have never been greater.\n\n> "The strength of ABG has always been its people. Reaching 5,000 members proves that our mission of connecting Asian business leaders resonates." — ABG Leadership Team\n\n### What's Next\n\nWe're launching new features to help you find connections faster, including **AI-powered matching** and **category-based requests** for love, jobs, hiring, and professional networking.\n\nStay tuned for more updates!`,
    'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&h=400&fit=crop',
    'ABG Admin',
    '2026-03-01T08:00:00.000Z',
    'TRUE',
    'TRUE',
    now,
  ],
  [
    'news-002',
    'New Feature: AI-Powered Connection Matching Now Live',
    'ai-powered-connection-matching-now-live',
    'Announcement',
    'Find your ideal professional match, job opportunity, or even romantic partner with our new AI matching system powered by Gemini.',
    `## Smarter Connections, Faster Results\n\nWe've just rolled out our most requested feature: **AI-Powered Connection Matching**.\n\nUsing Google's Gemini AI, our system now analyzes your request and matches you with the most relevant alumni based on:\n\n- **Professional expertise** and industry alignment\n- **Shared interests** and values\n- **Compatibility scores** for each match\n\n### Four Categories to Choose From\n\n1. **Love Matching** — Find a romantic partner through our privacy-first dating flow\n2. **Job Hunting** — Discover open roles shared by fellow alumni\n3. **Recruitment** — Find talented candidates for your team\n4. **Professional Network** — Build strategic business partnerships\n\n### How It Works\n\n1. Choose your category\n2. Describe what you're looking for\n3. Our AI finds your top matches\n4. Send a personalized introduction\n\nTry it now by clicking **Find Connections** above!`,
    'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop',
    'Product Team',
    '2026-03-02T10:00:00.000Z',
    'TRUE',
    'FALSE',
    now,
  ],
  [
    'news-003',
    'ABG Leadership Summit 2026: Registration Now Open',
    'abg-leadership-summit-2026-registration-open',
    'Event',
    'Join 500+ alumni leaders in Ho Chi Minh City this April for three days of networking, workshops, and keynote sessions.',
    `## The Premier ABG Event of the Year\n\n**Date:** April 18-20, 2026\n**Location:** Sheraton Saigon Hotel, Ho Chi Minh City\n**Expected Attendance:** 500+ alumni\n\n### Keynote Speakers\n\n- **Dr. Nguyen Minh Tuan** — CEO, VinTech Group\n- **Sarah Chen** — Partner, McKinsey & Company SEA\n- **Ravi Patel** — Founder, TechBridge Ventures\n\n### Workshop Tracks\n\n| Track | Focus Area |\n|-------|------------|\n| **Innovation** | AI, Web3, Climate Tech |\n| **Leadership** | C-suite skills, Board governance |\n| **Entrepreneurship** | Fundraising, Scaling, Exits |\n| **Career** | Transitions, Personal branding |\n\n### Early Bird Pricing\n\n- ABG Premium Members: **Free**\n- ABG Basic Members: **$99** (until March 31)\n- Non-members: **$249**\n\n[Register now through the ABG portal!](https://abg-alumni-connect.vercel.app/request)`,
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=400&fit=crop',
    'Events Team',
    '2026-02-28T09:00:00.000Z',
    'TRUE',
    'FALSE',
    now,
  ],
  [
    'news-004',
    'Free Online Course: Building Your Personal Brand in Asia',
    'free-course-building-personal-brand-asia',
    'Course',
    'A 4-week self-paced course designed for ABG alumni to strengthen their professional presence across Asian markets.',
    `## Course Overview\n\nThis free online course is designed exclusively for ABG alumni who want to build a powerful professional brand across Asian markets.\n\n### What You'll Learn\n\n**Week 1: Foundation**\n- Defining your unique value proposition\n- Identifying your target audience\n\n**Week 2: Digital Presence**\n- Optimizing LinkedIn for Asian markets\n- Content strategy that resonates regionally\n\n**Week 3: Networking**\n- Leveraging ABG connections effectively\n- Cross-cultural communication tips\n\n**Week 4: Execution**\n- Building a 90-day personal brand plan\n- Measuring your brand impact\n\n### Course Details\n\n- **Duration:** 4 weeks, self-paced\n- **Format:** Video lessons + worksheets\n- **Certificate:** ABG Certified upon completion\n- **Cost:** Free for all ABG members\n\nEnroll through the ABG learning portal today!`,
    'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&h=400&fit=crop',
    'Learning Team',
    '2026-02-25T07:00:00.000Z',
    'TRUE',
    'FALSE',
    now,
  ],
  [
    'news-005',
    'Alumni Spotlight: How Linh Tran Built a $10M EdTech Startup',
    'alumni-spotlight-linh-tran-edtech-startup',
    'Business',
    'From ABG mentorship to Series A: Linh Tran shares her journey building EduPath, a platform transforming education access in Vietnam.',
    `## From Mentee to Founder\n\nWhen Linh Tran joined ABG in 2022, she was a product manager at a mid-size tech company with a dream of starting her own business.\n\nFour years later, her EdTech startup **EduPath** just closed a **$10M Series A** led by Sequoia Capital Southeast Asia.\n\n### The ABG Connection\n\n> "I found my co-founder and two of my advisors through ABG's matching platform. The community doesn't just connect you — it accelerates you." — Linh Tran\n\n### Key Milestones\n\n- **2022:** Joined ABG, connected with mentor David Lim\n- **2023:** Founded EduPath with co-founder met via ABG matching\n- **2024:** Reached 100,000 students on the platform\n- **2025:** Raised $2.5M seed round\n- **2026:** Closed $10M Series A, expanding to 5 countries\n\n### Her Advice to Alumni\n\n1. **Use the matching system** — Be specific about what you need\n2. **Give back** — Mentor others as you grow\n3. **Stay active** — The best opportunities come from consistent engagement\n\nKnow an alumni with an inspiring story? Reach out to us!`,
    'https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=800&h=400&fit=crop',
    'Editorial Team',
    '2026-02-20T11:00:00.000Z',
    'TRUE',
    'FALSE',
    now,
  ],
  [
    'news-006',
    'New Partnership: ABG x Google for Startups SEA Accelerator',
    'abg-google-startups-sea-accelerator-partnership',
    'Business',
    'ABG alumni now get priority access to Google for Startups SEA accelerator programs, plus $100K in cloud credits.',
    `## Exciting Partnership Announcement\n\nWe're proud to announce a strategic partnership between **ABG Alumni Network** and **Google for Startups Southeast Asia**.\n\n### What This Means for You\n\n- **Priority access** to Google for Startups Accelerator programs\n- **$100,000** in Google Cloud credits for qualifying startups\n- **Exclusive workshops** with Google engineers and product leaders\n- **Demo Day invitations** to pitch to top VCs\n\n### Eligibility\n\nABG members who meet these criteria:\n- Active ABG membership (Basic or Premium)\n- Tech startup in pre-seed to Series A stage\n- Operating in Southeast Asia\n\n### How to Apply\n\n1. Log in to ABG Alumni Connect\n2. Navigate to your profile\n3. Apply through the Google Startups section\n\nApplication deadline: **April 15, 2026**\n\nThis partnership reinforces our commitment to supporting alumni entrepreneurs across the region.`,
    'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=400&fit=crop',
    'Partnerships Team',
    '2026-02-15T14:00:00.000Z',
    'TRUE',
    'FALSE',
    now,
  ],
  [
    'news-007',
    'Workshop Recap: Mastering Fundraising in Southeast Asia',
    'workshop-recap-mastering-fundraising-southeast-asia',
    'Edu',
    'Key takeaways from our sold-out workshop with 3 leading VCs on navigating the SEA fundraising landscape in 2026.',
    `## Workshop Highlights\n\nOur February workshop on fundraising brought together **200+ alumni** with three of Southeast Asia's most active venture capitalists.\n\n### Panel Speakers\n\n- **James Riady** — Managing Partner, East Ventures\n- **Yinglan Tan** — Founding Partner, Insignia Ventures\n- **Binh Tran** — Co-founder, Ascend Vietnam Ventures\n\n### Top 5 Takeaways\n\n1. **AI-native startups** are seeing 3x faster fundraising timelines\n2. **Revenue matters more than growth** in the current market\n3. **Regional expansion** from Day 1 is now expected by investors\n4. **Climate tech and health tech** are the hottest sectors for 2026\n5. **Warm intros** through networks like ABG still convert 5x better than cold outreach\n\n### Attendee Feedback\n\n- 95% rated the workshop "Excellent" or "Very Good"\n- 78% said they gained actionable fundraising insights\n- 62% plan to start fundraising within 6 months\n\nMissed it? Watch the recording in our member portal.`,
    'https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=800&h=400&fit=crop',
    'Events Team',
    '2026-02-10T10:00:00.000Z',
    'TRUE',
    'FALSE',
    now,
  ],
  [
    'news-008',
    'ABG Chapter Launch: Welcome Cambodia & Myanmar!',
    'abg-chapter-launch-cambodia-myanmar',
    'Announcement',
    'Two new chapters join the ABG family, bringing our network to 8 countries across Southeast Asia.',
    `## Expanding Our Reach\n\nWe're excited to welcome **Cambodia** and **Myanmar** as the newest chapters in the ABG Alumni Network!\n\n### Cambodia Chapter\n\n- **Chapter Lead:** Sokha Meas\n- **Members:** 120+ founding members\n- **Focus:** FinTech, Agriculture Tech, Tourism\n- **Launch Event:** Phnom Penh, January 28, 2026\n\n### Myanmar Chapter\n\n- **Chapter Lead:** Aung Kyaw Moe\n- **Members:** 85+ founding members\n- **Focus:** Social Enterprise, Education, Healthcare\n- **Launch Event:** Yangon, February 1, 2026\n\n### What This Means\n\nWith 8 active chapters, ABG now provides the most comprehensive alumni network for young Asian business leaders in the region.\n\nWelcome aboard, Cambodia and Myanmar! 🎉`,
    'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&h=400&fit=crop',
    'Community Team',
    '2026-02-05T08:00:00.000Z',
    'TRUE',
    'FALSE',
    now,
  ],
  [
    'news-009',
    'Career Fair 2026: Top Companies Hiring ABG Alumni',
    'career-fair-2026-top-companies-hiring-abg-alumni',
    'Event',
    'Over 30 leading companies across tech, finance, and consulting are looking to hire ABG alumni at our virtual career fair.',
    `## Your Next Career Move\n\n**Date:** March 15, 2026 (Virtual)\n**Time:** 9:00 AM - 5:00 PM (SGT)\n**Companies:** 30+ participating\n\n### Featured Employers\n\n| Company | Roles | Location |\n|---------|-------|----------|\n| Grab | Engineering, Product | Singapore, Vietnam |\n| Shopee | Data Science, Marketing | Multiple |\n| BCG | Consulting, Strategy | Singapore |\n| GoTo | Engineering, Design | Indonesia |\n| Lazada | Operations, Tech | Thailand |\n| VNG | AI/ML, Backend | Vietnam |\n\n### How to Participate\n\n1. **Update your ABG profile** with latest experience\n2. **Browse open positions** on the career fair page\n3. **Schedule 1:1 chats** with recruiters\n4. **Attend company presentations** throughout the day\n\n### Pro Tips\n\n- Use ABG's matching feature to discover roles aligned with your skills\n- Premium members get **priority scheduling** with recruiters\n- Prepare a 60-second elevator pitch\n\nRegistration opens March 5!`,
    'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&h=400&fit=crop',
    'Career Services',
    '2026-03-03T06:00:00.000Z',
    'TRUE',
    'FALSE',
    now,
  ],
];

async function seedNews() {
  console.log('Seeding news articles to Google Sheets...');

  // Check if header row exists
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1:L1`,
  });

  if (!existing.data.values || existing.data.values.length === 0) {
    // Add header row first
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:L`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [['id', 'title', 'slug', 'category', 'excerpt', 'content', 'image_url', 'author_name', 'published_date', 'is_published', 'is_featured', 'created_at']],
      },
    });
    console.log('Header row added.');
  }

  // Append all articles
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:L`,
    valueInputOption: 'RAW',
    requestBody: {
      values: articles,
    },
  });

  console.log(`✓ ${articles.length} articles seeded successfully!`);
}

seedNews().catch((err) => {
  console.error('Failed to seed news:', err);
  process.exit(1);
});
