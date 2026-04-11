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
${targetDate ? `Thời gian: ${targetDate}` : ''}
${extra ? `Thông tin thêm: ${extra}` : ''}

Yêu cầu:
- LUÔN viết bằng tiếng Việt, kể cả khi thông tin đầu vào bằng tiếng Anh
- Viết thân thiện, gần gũi như đang nói chuyện với anh chị em trong cộng đồng
- Có phần mở đầu thu hút
- Nêu rõ mục đích và lợi ích khi tham gia
- Kết thúc bằng lời kêu gọi hành động
- KHÔNG thêm tiêu đề, chỉ viết nội dung
- KHÔNG viết quá dài, giữ ngắn gọn

QUAN TRỌNG: Sau nội dung bài viết, thêm một dòng mới với format:
TAGS: ["thẻ1", "thẻ2", "thẻ3"]
Tạo 3-5 thẻ ngắn gọn bằng tiếng Việt (1-3 từ mỗi thẻ, viết thường) để phân loại đề xuất này. Thẻ phải liên quan trực tiếp đến nội dung hoạt động.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Extract tags from the response
    let description = text;
    let tags: string[] = [];
    const tagsMatch = text.match(/TAGS:\s*(\[[\s\S]*?\])/);
    if (tagsMatch) {
      description = text.substring(0, tagsMatch.index).trim();
      try {
        const parsed = JSON.parse(tagsMatch[1]);
        tags = parsed
          .filter((t: unknown) => typeof t === 'string' && (t as string).trim())
          .map((t: string) => t.trim().toLowerCase())
          .slice(0, 5);
      } catch {}
    }

    return successResponse({ description, tags });
  } catch (error) {
    return handleApiError(error);
  }
}
