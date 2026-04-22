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

    const { title, category, description, location, duration, timeSlots } = await request.json();

    if (!title || !description) {
      return errorResponse('Title and description are required', 400);
    }

    const categoryLabels: Record<string, string> = {
      talk: 'buổi nói chuyện/chia sẻ',
      fieldtrip: 'chuyến dã ngoại/tham quan',
      sports: 'hoạt động thể thao',
      community_support: 'hoạt động hỗ trợ cộng đồng',
      coffee: 'buổi cà phê gặp gỡ',
    };

    const categoryLabel = categoryLabels[category] || 'hoạt động';

    const prompt = `Bạn là người lập kế hoạch cho cộng đồng alumni ABG (Alumni of Business and Governance). Hãy tạo một chương trình/agenda chi tiết cho ${categoryLabel} dựa trên thông tin sau:

Tên hoạt động: ${title}
Mô tả: ${description}
${location ? `Địa điểm: ${location}` : ''}
${duration ? `Thời lượng: ${duration}` : ''}
${timeSlots && timeSlots.length > 0 ? `Các khung giờ đề xuất từ poll:\n${timeSlots.map((s: { date: string; startTime: string; endTime: string }) => `- ${s.date}: ${s.startTime} - ${s.endTime}`).join('\n')}` : ''}

Yêu cầu:
- LUÔN viết bằng tiếng Việt
- Tạo chương trình chi tiết với các mốc thời gian cụ thể
- Nếu có khung giờ từ poll, SỬ DỤNG CHÍNH XÁC các khung giờ đó (startTime-endTime) để chia agenda thành các phần tương ứng
- Sử dụng format rõ ràng, dễ đọc
- Phù hợp với loại hoạt động "${categoryLabel}"
- Nếu là fieldtrip/dã ngoại: bao gồm các điểm dừng, hoạt động tại mỗi điểm
- Nếu là talk/chia sẻ: bao gồm phần mở đầu, nội dung chính, Q&A, kết thúc
- Nếu là sports/thể thao: bao gồm khởi động, hoạt động chính, nghỉ giải lao, kết thúc
- Nếu là community_support: bao gồm briefing, phân công, thực hiện, tổng kết
- Giữ ngắn gọn nhưng đầy đủ thông tin
- MỖI bullet point TỐI ĐA 5-7 từ, viết cô đọng kiểu gạch đầu dòng, KHÔNG viết câu dài
- KHÔNG thêm tiêu đề "Chương trình" hay "Agenda" ở đầu, chỉ viết nội dung
- Sử dụng emoji phù hợp để dễ đọc`;

    const result = await model.generateContent(prompt);
    const agenda = result.response.text().trim();

    return successResponse({ agenda });
  } catch (error) {
    return handleApiError(error);
  }
}
