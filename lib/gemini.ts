
import { GoogleGenerativeAI } from '@google/generative-ai';
import { DatingProfile } from '@/types/dating';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
// Low temperature for matching to produce more consistent/deterministic results
const matchingModel = genAI.getGenerativeModel({
  model: 'gemini-flash-latest',
  generationConfig: { temperature: 0.3 },
});

export async function generateBio(data: {
  name: string;
  role: string;
  company: string;
  expertise: string;
  can_help_with: string;
  looking_for: string;
}): Promise<string> {
  const prompt = `Based on this member info, write a 2-3 sentence professional bio:
Name: ${data.name}
Role: ${data.role} at ${data.company}
Expertise: ${data.expertise}
Can help with: ${data.can_help_with}
Looking for: ${data.looking_for}

Keep it professional, concise, third-person. No markdown formatting.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error('Gemini generateBio error:', error);
    return `${data.name} is a ${data.role} at ${data.company}.`; // Fallback bio
  }
}

export async function findMatches(
  requestText: string,
  members: {
    id: string;
    name: string;
    expertise: string;
    can_help_with: string;
    bio: string;
    job_preferences?: string;
    hiring_preferences?: string;
  }[],
  locale: string = 'en',
  type: string = 'professional',
  excludeIds: string[] = []
): Promise<{ id: string; reason: string; match_score: number }[]> {
  // Filter out excluded IDs (for reroll)
  const filtered = excludeIds.length > 0
    ? members.filter(m => !excludeIds.includes(m.id))
    : members;
  if (filtered.length === 0) return [];
  const membersJson = JSON.stringify(filtered.map(m => ({
    id: m.id,
    name: m.name,
    expertise: m.expertise,
    can_help_with: m.can_help_with,
    bio: m.bio,
    job_preferences: m.job_preferences,
    hiring_preferences: m.hiring_preferences,
  })));

  let prompt = '';

  const matchCount = Math.min(10, filtered.length);
  const minMatches = Math.min(3, filtered.length);

  const minMatchInstruction = locale === 'vi'
    ? `QUAN TRỌNG: Bạn PHẢI trả về ít nhất ${minMatches} kết quả. Nếu không đủ người phù hợp hoàn hảo, hãy bao gồm cả những người phù hợp một phần với điểm match_score thấp hơn. Luôn trả về ${minMatches}-${matchCount} kết quả.`
    : `IMPORTANT: You MUST return at least ${minMatches} results. If there aren't enough perfect matches, include partial matches with lower match_score. Always return ${minMatches}-${matchCount} results.`;

  if (type === 'job') {
    prompt = locale === 'vi'
      ? `Bạn là một chuyên gia tư vấn nghề nghiệp. Thành viên này đang tìm việc: "${requestText}"
         Đây là danh sách các nhà tuyển dụng tiềm năng (thành viên đang Hiring):
         ${membersJson}
         Chọn ${minMatches}-${matchCount} nhà tuyển dụng phù hợp nhất dựa trên nhu cầu tuyển dụng của họ (hiring_preferences) và chuyên môn.
         ${minMatchInstruction}
         Giải thích ngắn gọn tại sao nên ứng tuyển. Cho điểm match_score từ 0-100.`
      : `You are a career consultant. This member is looking for a job: "${requestText}"
         Here are potential employers (members who are Hiring):
         ${membersJson}
         Select ${minMatches}-${matchCount} best matching employers based on their hiring_preferences and expertise.
         ${minMatchInstruction}
         Briefly explain why they should apply. Include match_score (0-100).`;
  } else if (type === 'hiring') {
    prompt = locale === 'vi'
      ? `Bạn là một chuyên gia tuyển dụng. Thành viên này đang muốn tuyển nhân sự: "${requestText}"
          Đây là danh sách các ứng viên tiềm năng (thành viên Open to Work):
          ${membersJson}
          Chọn ${minMatches}-${matchCount} ứng viên phù hợp nhất dựa trên mong muốn tìm việc của họ (job_preferences) và chuyên môn.
          ${minMatchInstruction}
          Giải thích ngắn gọn tại sao nên phỏng vấn họ. Cho điểm match_score từ 0-100.`
      : `You are a recruitment expert. This member is hiring: "${requestText}"
          Here are potential candidates (members Open to Work):
          ${membersJson}
          Select ${minMatches}-${matchCount} best candidates based on their job_preferences and expertise.
          ${minMatchInstruction}
          Briefly explain why they are a good fit. Include match_score (0-100).`;
  } else {
    // Professional / Partner
    prompt = locale === 'vi'
      ? `Bạn là người kết nối chuyên nghiệp cho cộng đồng ABG Alumni. Một thành viên cần giúp đỡ:
"${requestText}"

Đây là danh sách các thành viên hiện có:
${membersJson}

Hãy chọn ${minMatches}-${matchCount} người phù hợp nhất dựa trên chuyên môn và những gì họ có thể giúp.
${minMatchInstruction}
Với mỗi người, hãy giải thích trong 1-2 câu tiếng Việt TẠI SAO họ phù hợp với yêu cầu này. Cho điểm match_score từ 0-100.

Trả về CHỈ một mảng JSON hợp lệ, không dùng markdown:
[{"id": "member_id", "reason": "Tại sao họ phù hợp", "match_score": 85}]`
      : `You are a professional networker for the ABG Alumni community. A member needs help:
"${requestText}"

Here are available members:
${membersJson}

Select ${minMatches}-${matchCount} best matches based on their expertise and what they can help with.
${minMatchInstruction}
For each, explain in 1-2 sentences WHY they're relevant to this specific request. Include match_score (0-100).

Return ONLY valid JSON array, no markdown:
[{"id": "member_id", "reason": "Why they match", "match_score": 85}]`;
  }

  // Common JSON instruction for job/hiring
  if (type !== 'professional') {
    prompt += locale === 'vi'
      ? `\nTrả về CHỈ một mảng JSON hợp lệ, không dùng markdown: [{"id": "member_id", "reason": "Lý do phù hợp", "match_score": 85}]`
      : `\nReturn ONLY valid JSON array, no markdown: [{"id": "member_id", "reason": "Why they match", "match_score": 85}]`;
  }

  try {
    const result = await matchingModel.generateContent(prompt);
    const text = result.response.text().trim();

    // Clean JSON if wrapped in markdown
    const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      let matches: { id: string; reason: string; match_score: number }[] = JSON.parse(jsonStr);

      // Ensure minimum results by padding with unmatched candidates
      if (matches.length < minMatches) {
        const matchedIds = new Set(matches.map(m => m.id));
        const remaining = filtered.filter(m => !matchedIds.has(m.id));
        const padding = remaining.slice(0, minMatches - matches.length).map(m => ({
          id: m.id,
          reason: locale === 'vi' ? 'Thành viên cộng đồng có thể hỗ trợ.' : 'Community member who may be able to help.',
          match_score: 40,
        }));
        matches = [...matches, ...padding];
      }

      return matches;
    } catch {
      console.error('Failed to parse Gemini response:', text);
      return [];
    }
  } catch (error) {
    console.error('Gemini findMatches error:', error);
    // Fallback: return the first 5 members as matches
    return filtered.slice(0, minMatches).map(m => ({
      id: m.id,
      reason: "Matched based on availability (AI unavailable).",
      match_score: 50,
    }));
  }
}

export async function findDatingMatches(
  requestText: string,
  profiles: DatingProfile[],
  locale: string = 'en',
  excludeIds: string[] = []
): Promise<{ id: string; reason: string; match_score: number }[]> {
  // Filter out excluded IDs (for reroll)
  const filtered = excludeIds.length > 0
    ? profiles.filter(p => !excludeIds.includes(p.id))
    : profiles;
  if (filtered.length === 0) return [];

  const matchCount = Math.min(5, filtered.length);
  const minMatches = Math.min(3, filtered.length);

  // Use Nickname instead of real name for privacy
  const profilesJson = JSON.stringify(filtered.map(p => ({
    id: p.id,
    nickname: p.nickname,
    gender: p.gender,
    age: new Date().getFullYear() - parseInt(p.birth_year || '2000'),
    location: p.location,
    self_desc: p.self_description, // 3 words
    truth_lie: p.truth_lie,
    ideal_day: p.ideal_day,
    interests: p.interests,
    core_values: p.core_values,
    qualities: p.qualities_looking_for,
  })));

  const minMatchInstruction = locale === 'vi'
    ? `QUAN TRỌNG: Bạn PHẢI trả về ít nhất ${minMatches} kết quả. Nếu không đủ người phù hợp hoàn hảo, hãy bao gồm cả những người phù hợp một phần với điểm match_score thấp hơn. Luôn trả về ${minMatches}-${matchCount} kết quả.`
    : `IMPORTANT: You MUST return at least ${minMatches} results. If there aren't enough perfect matches, include partial matches with lower match_score. Always return ${minMatches}-${matchCount} results.`;

  const prompt = locale === 'vi'
    ? `Bạn là người mai mối cho một cộng đồng alumni chất lượng cao. Một thành viên đang tìm kiếm người yêu:
"${requestText}"

Đây là các hồ sơ hẹn hò ẩn danh:
${profilesJson}

Hãy chọn ${minMatches}-${matchCount} người phù hợp nhất dựa trên sự tương đồng về giá trị sống, sở thích, nơi ở và tính cách.
${minMatchInstruction}
Với mỗi người, hãy giải thích trong 1-2 câu tiếng Việt TẠI SAO họ là một cặp đôi phù hợp. Cho điểm match_score từ 0-100.
Hãy tập trung vào "Ideal Day" (Ngày lý tưởng), "Core Values" (Giá trị cốt lõi), và "Interests" (Sở thích) của họ.

Trả về CHỈ một mảng JSON hợp lệ, không dùng markdown:
[{"id": "profile_id", "reason": "Tại sao họ phù hợp", "match_score": 85}]`
    : `You are a matchmaker for a high-quality alumni community. A member is looking for a partner:
"${requestText}"

Here are the anonymous dating profiles:
${profilesJson}

Select ${minMatches}-${matchCount} best matches based on compatibility of values, interests, location, and personality.
${minMatchInstruction}
For each, explain in 1-2 sentences WHY they're a good match. Include match_score (0-100).
Focus on their "Ideal Day", "Core Values", and "Interests".

Return ONLY valid JSON array, no markdown:
[{"id": "profile_id", "reason": "Why they match", "match_score": 85}]`;

  try {
    const result = await matchingModel.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    let matches: { id: string; reason: string; match_score: number }[] = JSON.parse(jsonStr);

    // Ensure minimum results by padding with unmatched profiles
    if (matches.length < minMatches) {
      const matchedIds = new Set(matches.map(m => m.id));
      const remaining = filtered.filter(p => !matchedIds.has(p.id));
      const padding = remaining.slice(0, minMatches - matches.length).map(p => ({
        id: p.id,
        reason: locale === 'vi' ? 'Thành viên cộng đồng có tiềm năng kết nối.' : 'Community member with connection potential.',
        match_score: 40,
      }));
      matches = [...matches, ...padding];
    }

    return matches;
  } catch (error) {
    console.error('Gemini findDatingMatches error:', error);
    return filtered.slice(0, minMatches).map(p => ({
      id: p.id,
      reason: "Matched based on shared community interest.",
      match_score: 50,
    }));
  }
}

export async function translateNewsArticle(input: {
  title_vi: string;
  excerpt_vi: string;
  content_vi: string;
  instructions?: string;
}): Promise<{ title: string; excerpt: string; content: string }> {
  const instructionContext = input.instructions
    ? `\nAdditional context from editor: ${input.instructions}`
    : '';

  const prompt = `You are a professional Vietnamese-to-English translator for a business alumni community news portal.

Translate the following Vietnamese news article into natural, professional English.
Preserve all Markdown formatting in the content field.
Do not add any content that wasn't in the original.
${instructionContext}

Vietnamese Title: ${input.title_vi}

Vietnamese Excerpt: ${input.excerpt_vi}

Vietnamese Content:
${input.content_vi}

Return ONLY valid JSON, no markdown wrapping:
{"title": "English title", "excerpt": "English excerpt", "content": "English content with markdown preserved"}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(jsonStr);

    return {
      title: parsed.title || '',
      excerpt: parsed.excerpt || '',
      content: parsed.content || '',
    };
  } catch (error) {
    console.error('Gemini translateNewsArticle error:', error);
    throw new Error('Translation failed. Please try again.');
  }
}

export async function transcribeVoice(audioBase64: string): Promise<string> {
  const prompt = 'Transcribe this audio accurately. Return only the transcription, no extra text.';

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        mimeType: 'audio/webm',
        data: audioBase64,
      },
    },
  ]);

  return result.response.text().trim();
}
