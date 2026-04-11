import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({
  model: 'gemini-flash-latest',
  generationConfig: { temperature: 0.5 },
});

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);

    const { title, category, description } = await request.json();

    if (!title) {
      return errorResponse('Title is required', 400);
    }

    const prompt = `Bạn là hệ thống gắn thẻ (tag) cho đề xuất hoạt động cộng đồng alumni ABG.

Dựa trên thông tin sau, tạo 3-5 thẻ (tags) ngắn gọn bằng tiếng Việt để phân loại đề xuất này. Mỗi thẻ nên là 1-3 từ, viết thường, không dấu gạch, không emoji.

Tên hoạt động: ${title}
Loại: ${category || 'other'}
${description ? `Mô tả: ${description}` : ''}

Yêu cầu:
- Trả về CHÍNH XÁC một mảng JSON, ví dụ: ["giáo dục", "công nghệ", "hà nội"]
- Chỉ trả về mảng JSON, KHÔNG có text nào khác
- 3-5 thẻ, mỗi thẻ 1-3 từ tiếng Việt
- Thẻ phải liên quan trực tiếp đến nội dung
- Ưu tiên các thẻ giúp người dùng tìm kiếm và phân loại`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Parse the JSON array from the response
    const jsonMatch = text.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) {
      return errorResponse('Failed to generate tags', 500);
    }

    const tags: string[] = JSON.parse(jsonMatch[0]);
    const cleanTags = tags
      .filter((t) => typeof t === 'string' && t.trim())
      .map((t) => t.trim().toLowerCase())
      .slice(0, 5);

    return successResponse({ tags: cleanTags });
  } catch (error) {
    return handleApiError(error);
  }
}
