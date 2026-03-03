/**
 * Writes Vietnamese translations for existing News articles to columns M-O.
 * Usage: npx tsx scripts/seed-news-vietnamese.ts
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

// Vietnamese translations: [title_vi, excerpt_vi, content_vi] per article (ordered by row)
const translations: [string, string, string][] = [
  // news-001: ABG Alumni Network Surpasses 5,000 Members
  [
    'Mạng lưới ABG Alumni vượt mốc 5.000 thành viên tại Đông Nam Á',
    'Cột mốc đáng tự hào khi cộng đồng alumni đạt 5.000 thành viên tích cực tại 8 quốc gia trong khu vực.',
    `## Cộng đồng đang lớn mạnh

Chúng tôi vui mừng thông báo **Mạng lưới ABG Alumni** đã chính thức vượt mốc **5.000 thành viên tích cực** trên khắp Đông Nam Á!

Cột mốc này phản ánh năng lượng và cam kết tuyệt vời của cộng đồng alumni, trải dài các chi hội tại:

- Việt Nam
- Singapore
- Indonesia
- Thái Lan
- Philippines
- Malaysia
- Myanmar
- Campuchia

### Điều này có ý nghĩa gì

Với hơn 5.000 chuyên gia kết nối qua nền tảng, cơ hội mentorship, hợp tác và phát triển sự nghiệp chưa bao giờ lớn đến thế.

> "Sức mạnh của ABG luôn nằm ở con người. Đạt 5.000 thành viên chứng minh sứ mệnh kết nối các nhà lãnh đạo kinh doanh châu Á đang lan tỏa." — Đội ngũ Lãnh đạo ABG

### Tiếp theo là gì

Chúng tôi đang ra mắt các tính năng mới giúp bạn tìm kết nối nhanh hơn, bao gồm **ghép đôi bằng AI** và **yêu cầu theo danh mục** cho tình yêu, việc làm, tuyển dụng và networking chuyên nghiệp.

Hãy đón chờ thêm cập nhật!`,
  ],
  // news-002: AI-Powered Connection Matching
  [
    'Tính năng mới: Ghép đôi kết nối bằng AI đã hoạt động',
    'Tìm đối tác chuyên nghiệp, cơ hội việc làm hoặc nửa kia lý tưởng với hệ thống ghép đôi AI sử dụng Gemini.',
    `## Kết nối thông minh hơn, kết quả nhanh hơn

Chúng tôi vừa ra mắt tính năng được yêu cầu nhiều nhất: **Ghép đôi kết nối bằng AI**.

Sử dụng Gemini AI của Google, hệ thống phân tích yêu cầu của bạn và ghép với alumni phù hợp nhất dựa trên:

- **Chuyên môn nghề nghiệp** và lĩnh vực ngành
- **Sở thích chung** và giá trị
- **Điểm tương thích** cho mỗi kết quả

### Bốn danh mục để lựa chọn

1. **Ghép đôi tình yêu** — Tìm đối tượng hẹn hò qua quy trình bảo mật riêng tư
2. **Tìm việc** — Khám phá vị trí tuyển dụng từ fellow alumni
3. **Tuyển dụng** — Tìm ứng viên tài năng cho đội ngũ
4. **Mạng lưới chuyên nghiệp** — Xây dựng quan hệ đối tác kinh doanh chiến lược

### Cách hoạt động

1. Chọn danh mục
2. Mô tả những gì bạn tìm kiếm
3. AI tìm các kết quả phù hợp nhất
4. Gửi lời giới thiệu cá nhân

Thử ngay bằng cách nhấn **Kiếm kèo kết nối** phía trên!`,
  ],
  // news-003: Leadership Summit 2026
  [
    'ABG Leadership Summit 2026: Đã mở đăng ký',
    'Tham gia cùng 500+ alumni lãnh đạo tại TP.HCM tháng 4 này với 3 ngày networking, workshop và diễn thuyết.',
    `## Sự kiện ABG hàng đầu trong năm

**Ngày:** 18-20 tháng 4, 2026
**Địa điểm:** Khách sạn Sheraton Sài Gòn, TP. Hồ Chí Minh
**Dự kiến:** 500+ alumni tham dự

### Diễn giả chính

- **TS. Nguyễn Minh Tuấn** — CEO, VinTech Group
- **Sarah Chen** — Partner, McKinsey & Company SEA
- **Ravi Patel** — Founder, TechBridge Ventures

### Các track Workshop

| Track | Lĩnh vực |
|-------|----------|
| **Đổi mới** | AI, Web3, Climate Tech |
| **Lãnh đạo** | Kỹ năng C-suite, Quản trị hội đồng |
| **Khởi nghiệp** | Gọi vốn, Mở rộng, Thoái vốn |
| **Sự nghiệp** | Chuyển đổi, Xây dựng thương hiệu cá nhân |

### Giá Early Bird

- Thành viên ABG Premium: **Miễn phí**
- Thành viên ABG Basic: **$99** (đến 31/3)
- Không phải thành viên: **$249**

Đăng ký ngay qua cổng ABG!`,
  ],
  // news-004: Personal Brand Course
  [
    'Khoá học miễn phí: Xây dựng thương hiệu cá nhân tại châu Á',
    'Khoá học trực tuyến 4 tuần dành riêng cho alumni ABG để nâng cao sự hiện diện chuyên nghiệp trên thị trường châu Á.',
    `## Tổng quan khoá học

Khoá học trực tuyến miễn phí này được thiết kế riêng cho alumni ABG muốn xây dựng thương hiệu chuyên nghiệp mạnh mẽ trên thị trường châu Á.

### Bạn sẽ học gì

**Tuần 1: Nền tảng**
- Xác định giá trị độc đáo của bạn
- Nhận diện đối tượng mục tiêu

**Tuần 2: Hiện diện số**
- Tối ưu LinkedIn cho thị trường châu Á
- Chiến lược nội dung phù hợp khu vực

**Tuần 3: Networking**
- Tận dụng hiệu quả kết nối ABG
- Mẹo giao tiếp đa văn hoá

**Tuần 4: Thực thi**
- Xây dựng kế hoạch thương hiệu cá nhân 90 ngày
- Đo lường tác động thương hiệu

### Chi tiết khoá học

- **Thời lượng:** 4 tuần, tự học
- **Hình thức:** Video bài giảng + bài tập
- **Chứng chỉ:** ABG Certified khi hoàn thành
- **Chi phí:** Miễn phí cho tất cả thành viên ABG

Đăng ký qua cổng học tập ABG ngay hôm nay!`,
  ],
  // news-005: Alumni Spotlight Linh Tran
  [
    'Alumni nổi bật: Hành trình xây dựng startup EdTech $10M của Linh Trần',
    'Từ mentorship ABG đến Series A: Linh Trần chia sẻ hành trình xây dựng EduPath, nền tảng thay đổi tiếp cận giáo dục tại Việt Nam.',
    `## Từ mentee đến founder

Khi Linh Trần gia nhập ABG năm 2022, cô là product manager tại một công ty công nghệ tầm trung với ước mơ khởi nghiệp.

Bốn năm sau, startup EdTech **EduPath** của cô vừa chốt vòng **Series A $10M** do Sequoia Capital Southeast Asia dẫn dắt.

### Kết nối ABG

> "Tôi tìm được co-founder và hai cố vấn thông qua nền tảng ghép đôi ABG. Cộng đồng không chỉ kết nối bạn — nó đẩy nhanh bước tiến của bạn." — Linh Trần

### Các cột mốc quan trọng

- **2022:** Gia nhập ABG, kết nối với mentor David Lim
- **2023:** Sáng lập EduPath cùng co-founder quen qua ABG
- **2024:** Đạt 100.000 học viên trên nền tảng
- **2025:** Gọi vốn seed $2,5M
- **2026:** Chốt Series A $10M, mở rộng sang 5 quốc gia

### Lời khuyên cho alumni

1. **Sử dụng hệ thống ghép đôi** — Mô tả cụ thể những gì bạn cần
2. **Đóng góp lại** — Mentor người khác khi bạn phát triển
3. **Duy trì hoạt động** — Cơ hội tốt nhất đến từ sự tham gia liên tục

Bạn biết alumni nào có câu chuyện truyền cảm hứng? Hãy liên hệ với chúng tôi!`,
  ],
  // news-006: ABG x Google Partnership
  [
    'Hợp tác mới: ABG x Google for Startups SEA Accelerator',
    'Alumni ABG được ưu tiên tham gia chương trình Google for Startups SEA accelerator, cùng $100K tín dụng cloud.',
    `## Thông báo hợp tác quan trọng

Chúng tôi tự hào thông báo quan hệ đối tác chiến lược giữa **Mạng lưới ABG Alumni** và **Google for Startups Đông Nam Á**.

### Điều này có ý nghĩa gì với bạn

- **Ưu tiên truy cập** chương trình Google for Startups Accelerator
- **$100.000** tín dụng Google Cloud cho startup đủ điều kiện
- **Workshop độc quyền** với kỹ sư và product leader Google
- **Lời mời Demo Day** để pitch trước các VC hàng đầu

### Điều kiện

Thành viên ABG đáp ứng các tiêu chí:
- Thành viên ABG tích cực (Basic hoặc Premium)
- Startup công nghệ giai đoạn pre-seed đến Series A
- Hoạt động tại Đông Nam Á

### Cách đăng ký

1. Đăng nhập ABG Alumni Connect
2. Truy cập hồ sơ của bạn
3. Đăng ký qua mục Google Startups

Hạn đăng ký: **15 tháng 4, 2026**

Hợp tác này khẳng định cam kết hỗ trợ các doanh nhân alumni trong khu vực.`,
  ],
  // news-007: Fundraising Workshop Recap
  [
    'Tóm tắt Workshop: Làm chủ gọi vốn tại Đông Nam Á',
    'Những bài học quan trọng từ workshop cháy vé với 3 VC hàng đầu về bối cảnh gọi vốn SEA 2026.',
    `## Điểm nổi bật Workshop

Workshop tháng 2 về gọi vốn đã quy tụ **200+ alumni** cùng ba nhà đầu tư mạo hiểm tích cực nhất Đông Nam Á.

### Diễn giả

- **James Riady** — Managing Partner, East Ventures
- **Yinglan Tan** — Founding Partner, Insignia Ventures
- **Bình Trần** — Co-founder, Ascend Vietnam Ventures

### 5 bài học hàng đầu

1. **Startup AI-native** đang gọi vốn nhanh gấp 3 lần
2. **Doanh thu quan trọng hơn tăng trưởng** trong thị trường hiện tại
3. **Mở rộng khu vực** từ Ngày 1 hiện được nhà đầu tư kỳ vọng
4. **Climate tech và health tech** là lĩnh vực nóng nhất 2026
5. **Giới thiệu qua mạng lưới** như ABG vẫn chuyển đổi tốt gấp 5 lần so với cold outreach

### Phản hồi từ người tham dự

- 95% đánh giá workshop "Xuất sắc" hoặc "Rất tốt"
- 78% cho biết họ có thêm insight gọi vốn thực tế
- 62% dự định bắt đầu gọi vốn trong 6 tháng tới

Bỏ lỡ? Xem lại bản ghi trong cổng thành viên.`,
  ],
  // news-008: Cambodia & Myanmar Chapter Launch
  [
    'Ra mắt chi hội ABG: Chào mừng Campuchia & Myanmar!',
    'Hai chi hội mới gia nhập đại gia đình ABG, nâng mạng lưới lên 8 quốc gia trên khắp Đông Nam Á.',
    `## Mở rộng tầm ảnh hưởng

Chúng tôi vui mừng chào đón **Campuchia** và **Myanmar** là hai chi hội mới nhất trong Mạng lưới ABG Alumni!

### Chi hội Campuchia

- **Trưởng chi hội:** Sokha Meas
- **Thành viên:** 120+ thành viên sáng lập
- **Trọng tâm:** FinTech, Nông nghiệp Công nghệ, Du lịch
- **Sự kiện ra mắt:** Phnom Penh, 28 tháng 1, 2026

### Chi hội Myanmar

- **Trưởng chi hội:** Aung Kyaw Moe
- **Thành viên:** 85+ thành viên sáng lập
- **Trọng tâm:** Doanh nghiệp Xã hội, Giáo dục, Y tế
- **Sự kiện ra mắt:** Yangon, 1 tháng 2, 2026

### Điều này có ý nghĩa gì

Với 8 chi hội hoạt động, ABG hiện cung cấp mạng lưới alumni toàn diện nhất cho các nhà lãnh đạo kinh doanh trẻ châu Á trong khu vực.

Chào mừng Campuchia và Myanmar!`,
  ],
  // news-009: Career Fair 2026
  [
    'Career Fair 2026: Các công ty hàng đầu tuyển dụng Alumni ABG',
    'Hơn 30 công ty hàng đầu trong lĩnh vực công nghệ, tài chính và tư vấn đang tìm kiếm alumni ABG tại hội chợ việc làm trực tuyến.',
    `## Bước tiến sự nghiệp tiếp theo

**Ngày:** 15 tháng 3, 2026 (Trực tuyến)
**Thời gian:** 9:00 - 17:00 (SGT)
**Công ty:** 30+ tham gia

### Nhà tuyển dụng nổi bật

| Công ty | Vị trí | Địa điểm |
|---------|--------|----------|
| Grab | Kỹ thuật, Sản phẩm | Singapore, Việt Nam |
| Shopee | Data Science, Marketing | Nhiều nơi |
| BCG | Tư vấn, Chiến lược | Singapore |
| GoTo | Kỹ thuật, Thiết kế | Indonesia |
| Lazada | Vận hành, Công nghệ | Thái Lan |
| VNG | AI/ML, Backend | Việt Nam |

### Cách tham gia

1. **Cập nhật hồ sơ ABG** với kinh nghiệm mới nhất
2. **Duyệt vị trí tuyển dụng** trên trang career fair
3. **Đặt lịch chat 1:1** với nhà tuyển dụng
4. **Tham dự bài thuyết trình** của các công ty trong ngày

### Mẹo hay

- Dùng tính năng ghép đôi ABG để khám phá vị trí phù hợp kỹ năng
- Thành viên Premium được **ưu tiên đặt lịch** với nhà tuyển dụng
- Chuẩn bị bài giới thiệu 60 giây

Mở đăng ký từ 5 tháng 3!`,
  ],
];

async function seedVietnamese() {
  console.log('Reading existing News rows...');

  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:A`,
  });

  const rows = existing.data.values || [];
  const dataRowCount = rows.length - 1; // exclude header

  if (dataRowCount !== translations.length) {
    console.error(`Mismatch: ${dataRowCount} rows in sheet vs ${translations.length} translations. Aborting.`);
    process.exit(1);
  }

  // Add header for columns M-O if not present
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!M1:O1`,
    valueInputOption: 'RAW',
    requestBody: { values: [['title_vi', 'excerpt_vi', 'content_vi']] },
  });
  console.log('Header columns M-O set.');

  // Write Vietnamese content for rows 2-10 (data rows)
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!M2:O${dataRowCount + 1}`,
    valueInputOption: 'RAW',
    requestBody: { values: translations },
  });

  console.log(`✓ Vietnamese translations written for ${translations.length} articles!`);
}

seedVietnamese().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
