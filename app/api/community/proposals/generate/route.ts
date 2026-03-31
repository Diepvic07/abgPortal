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

    const { title, category, what, why, who, howMany, resources, extra, targetDate, locale } = await request.json();

    if (!title || !what) {
      return errorResponse('Title and description are required', 400);
    }

    const isVi = locale === 'vi';

    const prompt = isVi
      ? `Bạn là người viết nội dung cho cộng đồng alumni ABG. Dựa trên thông tin sau, viết một bài giới thiệu hoạt động hấp dẫn, rõ ràng, và truyền cảm hứng bằng tiếng Việt. Viết ngắn gọn (150-250 từ), sử dụng ngôn ngữ thân thiện, gần gũi. Dùng emoji phù hợp. Chia thành các đoạn ngắn dễ đọc.

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
- Viết thân thiện, gần gũi như đang nói chuyện với anh chị em trong cộng đồng
- Có phần mở đầu thu hút
- Nêu rõ mục đích và lợi ích khi tham gia
- Kết thúc bằng lời kêu gọi hành động
- KHÔNG thêm tiêu đề, chỉ viết nội dung
- KHÔNG viết quá dài, giữ ngắn gọn`
      : `You are a community content writer for ABG Alumni. Based on the following info, write an engaging, clear, and inspiring activity description in English. Keep it concise (150-250 words), use friendly language. Use appropriate emojis. Break into short readable paragraphs.

Activity name: ${title}
Category: ${category}
Description: ${what}
${why ? `Why it matters: ${why}` : ''}
${who ? `Target audience: ${who}` : ''}
${howMany ? `Expected participants: ${howMany}` : ''}
${resources ? `Resources needed: ${resources}` : ''}
${targetDate ? `Target date: ${targetDate}` : ''}
${extra ? `Additional info: ${extra}` : ''}

Requirements:
- Friendly, community tone
- Engaging opening
- Clear purpose and benefits of joining
- End with a call to action
- Do NOT include a title, just the body text
- Keep it concise`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return successResponse({ description: text });
  } catch (error) {
    return handleApiError(error);
  }
}
