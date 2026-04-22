import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({
  model: 'gemini-flash-latest',
  generationConfig: { temperature: 0.7 },
});

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);

    const { title, category, what, why, who, howMany, resources, extra, targetDate } = await request.json();

    if (!title || !what) {
      return errorResponse('Title and description are required', 400);
    }

    // Always generate in Vietnamese
    const prompt = `Bạn là người viết nội dung cho cộng đồng alumni ABG (Alumni of Business and Governance). Dựa trên thông tin sau, viết một bài giới thiệu hoạt động hấp dẫn, rõ ràng, và truyền cảm hứng bằng tiếng Việt. Viết ngắn gọn (150-250 từ), sử dụng ngôn ngữ thân thiện, gần gũi. Dùng emoji phù hợp. Chia thành các đoạn ngắn dễ đọc.

Tên hoạt động: ${title}
Loại: ${category}
Mô tả: ${what}
${why ? `Tại sao quan trọng: ${why}` : ''}
${who ? `Đối tượng: ${who}` : ''}
${howMany ? `Số lượng: ${howMany}` : ''}
${resources ? `Cần hỗ trợ: ${resources}` : ''}
${targetDate ? `Ngày dự kiến: ${targetDate}` : ''}
${extra ? `Thông tin thêm: ${extra}` : ''}

Yêu cầu:
- LUÔN viết bằng tiếng Việt, kể cả khi thông tin đầu vào bằng tiếng Anh
- Viết thân thiện, gần gũi như đang nói chuyện với anh chị em trong cộng đồng
- Có phần mở đầu thu hút
- Nêu rõ mục đích và lợi ích khi tham gia
- Kết thúc bằng lời kêu gọi hành động
- KHÔNG thêm tiêu đề, chỉ viết nội dung
- KHÔNG viết quá dài, giữ ngắn gọn

QUAN TRỌNG: Sau nội dung bài viết, thêm một dòng mới với format JSON:
META: {"category": "...", "tags": ["thẻ1", "thẻ2", "thẻ3"], "genre": "...", "location": "...", "participation_format": "...", "why": "...", "who": "...", "how_many": "...", "resources": "...", "target_date": "..."}

Quy tắc cho META:
- category: chọn MỘT loại hoạt động PHÙ HỢP NHẤT dựa trên NỘI DUNG THỰC TẾ (KHÔNG dùng giá trị người dùng đã chọn, hãy tự đánh giá lại):
  * "talk" = buổi nói chuyện, chia sẻ, workshop, webinar, thuyết trình (KHÔNG có di chuyển/du lịch)
  * "fieldtrip" = dã ngoại, du lịch, tham quan, đi chơi, khám phá địa điểm, camping, team building ngoài trời
  * "coffee" = cà phê, gặp gỡ nhẹ nhàng, networking, coffee chat, trà đàm
  * "sports" = thể thao, chạy bộ, marathon, đạp xe, bơi lội, gym
  * "community_support" = từ thiện, tình nguyện, hỗ trợ cộng đồng, quyên góp
- tags: 3-5 thẻ ngắn gọn bằng tiếng Việt (1-3 từ, viết thường), liên quan trực tiếp đến nội dung
- genre: chọn MỘT chủ đề: education, health, finance, technology, business, culture, environment, other
- location: nếu nội dung đề cập rõ địa điểm cụ thể, ghi "Hà Nội" hoặc "HCM" hoặc tên địa điểm khác. Nếu không rõ, để ""
- participation_format: chọn MỘT trong: online, offline, hybrid — dựa trên hình thức hoạt động được mô tả
- why: 1-2 câu giải thích tại sao hoạt động này quan trọng/có giá trị. Viết bằng tiếng Việt.
- who: đối tượng nên tham gia (VD: "Tất cả thành viên ABG", "Thành viên yêu thiên nhiên"). Viết bằng tiếng Việt.
- how_many: số lượng người dự kiến (VD: "20-30 người", "không giới hạn"). Nếu không rõ, để ""
- resources: cần hỗ trợ gì (VD: "Xe đưa đón, chi phí tham quan"). Nếu không rõ, để ""
- target_date: nếu nội dung đề cập thời gian cụ thể, ghi ngày (YYYY-MM-DD). Nếu không rõ, để ""`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Extract metadata from the response
    let description = text;
    let tags: string[] = [];
    let aiCategory = '';
    let genre = '';
    let location = '';
    let participation_format = '';
    let aiWhy = '';
    let aiWho = '';
    let aiHowMany = '';
    let aiResources = '';
    let aiTargetDate = '';
    const metaMatch = text.match(/META:\s*(\{[\s\S]*?\})/);
    if (metaMatch) {
      description = text.substring(0, metaMatch.index).trim();
      try {
        const meta = JSON.parse(metaMatch[1]);
        if (Array.isArray(meta.tags)) {
          tags = meta.tags
            .filter((t: unknown) => typeof t === 'string' && (t as string).trim())
            .map((t: string) => t.trim().toLowerCase())
            .slice(0, 5);
        }
        if (typeof meta.category === 'string') aiCategory = meta.category;
        if (typeof meta.genre === 'string') genre = meta.genre;
        if (typeof meta.location === 'string') location = meta.location;
        if (typeof meta.participation_format === 'string') participation_format = meta.participation_format;
        if (typeof meta.why === 'string') aiWhy = meta.why;
        if (typeof meta.who === 'string') aiWho = meta.who;
        if (typeof meta.how_many === 'string') aiHowMany = meta.how_many;
        if (typeof meta.resources === 'string') aiResources = meta.resources;
        if (typeof meta.target_date === 'string') aiTargetDate = meta.target_date;
      } catch {}
    }

    return successResponse({ description, tags, category: aiCategory, genre, location, participation_format, why: aiWhy, who: aiWho, how_many: aiHowMany, resources: aiResources, target_date: aiTargetDate });
  } catch (error) {
    return handleApiError(error);
  }
}
