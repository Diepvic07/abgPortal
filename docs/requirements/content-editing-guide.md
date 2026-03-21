# Hướng dẫn chỉnh sửa nội dung website (Dành cho Content Team)

## Tổng quan

Website ABG Alumni Connect có 2 ngôn ngữ: Tiếng Anh và Tiếng Việt. Nội dung tiếng Việt được quản lý qua file CSV mà bạn có thể mở bằng Google Sheets hoặc Excel.

**Bạn KHÔNG cần biết code.** Chỉ cần chỉnh sửa 1 cột duy nhất trong file CSV.

---

## Quy trình làm việc

### Bước 1: Nhận file CSV

Developer sẽ gửi file `vi-content-export.csv` cho bạn. Mở bằng Google Sheets (khuyến nghị) hoặc Excel.

### Bước 2: Hiểu cấu trúc file

File có 6 cột:

| Cột | Ý nghĩa | Bạn cần làm gì? |
|-----|---------|------------------|
| **Trang** | Tên trang trên website | Chỉ đọc |
| **Mô tả trang** | Giải thích trang đó hiển thị ở đâu | Chỉ đọc |
| **Key** | Mã định danh nội dung (cho developer) | **KHÔNG CHỈNH SỬA** |
| **Tiếng Anh** | Bản gốc tiếng Anh để tham khảo | Chỉ đọc |
| **Tiếng Việt hiện tại** | Nội dung tiếng Việt đang hiển thị | Chỉ đọc |
| **Tiếng Việt mới** | **CHỈ CHỈNH SỬA CỘT NÀY** | ✅ Chỉnh sửa |

### Bước 3: Chỉnh sửa nội dung

1. Tìm đến nhóm trang bạn muốn sửa (ví dụ: "🏠 Trang chủ")
2. Đọc cột **Tiếng Anh** để hiểu ý nghĩa gốc
3. Đọc cột **Tiếng Việt hiện tại** để xem bản dịch hiện tại
4. Sửa nội dung trong cột **Tiếng Việt mới (CHỈNH SỬA CỘT NÀY)**

### Bước 4: Gửi lại file

Khi chỉnh sửa xong, gửi file CSV lại cho developer. Developer sẽ cập nhật website.

---

## Danh sách các trang

| Ký hiệu | Trang | Mô tả |
|----------|-------|-------|
| 🌐 | Thanh điều hướng & Chân trang | Menu trên cùng và chân trang — hiển thị trên MỌI trang |
| 🔑 | Đăng nhập / Xác thực | Thông báo đăng nhập, đăng xuất |
| 🏠 | Trang chủ | Trang đầu tiên người dùng thấy — banner, giới thiệu |
| 📝 | Đăng ký / Tạo hồ sơ | Form đăng ký thành viên mới |
| 🔍 | Tìm kết nối | Trang nhập yêu cầu tìm người |
| 🤝 | Kết quả ghép đôi | Danh sách người phù hợp sau khi tìm kiếm |
| ❤️ | Hẹn hò & Tuyển dụng | Tab hẹn hò, tìm việc, tuyển dụng |
| 👤 | Hồ sơ cá nhân | Xem và chỉnh sửa hồ sơ |
| 📰 | Tin tức | Danh sách bài viết, chi tiết bài viết |
| 📋 | Lịch sử kết nối | Lịch sử yêu cầu đã gửi |
| 💳 | Thanh toán | Thông tin chuyển khoản, xác nhận |
| 📧 | Email tự động | Nội dung email hệ thống gửi tự động |
| ⚠️ | Trang lỗi | Thông báo lỗi |
| 🔧 | Chung | Nút bấm, thông báo dùng ở nhiều nơi |

---

## Lưu ý quan trọng

### KHÔNG được sửa
- Cột **Key** — đây là mã để hệ thống nhận diện, sửa sẽ gây lỗi
- Các dòng có dấu `---` — đây là dòng phân cách nhóm trang
- Nội dung trong dấu `{...}` — đây là biến hệ thống sẽ tự thay thế

### Biến hệ thống `{...}`
Một số nội dung có chứa `{tên_biến}` ví dụ:
- `{name}` → tên người dùng
- `{email}` → email người dùng
- `{count}` → số lượng
- `{score}` → điểm phù hợp
- `{provider}` → nhà cung cấp (Google, v.v.)

**Giữ nguyên** các biến này khi chỉnh sửa. Ví dụ:
- ✅ `Chào {name}, chào mừng bạn!`
- ❌ `Chào tên người dùng, chào mừng bạn!`

### Mẹo viết content
- Giữ ngắn gọn, dễ hiểu
- Phù hợp với ngữ cảnh trang (xem cột Mô tả trang)
- Giữ tone nhất quán giữa các trang
- Placeholder (gợi ý trong ô nhập liệu) nên bắt đầu bằng "VD:" hoặc "Ví dụ:"

---

## Dành cho Developer

### Export nội dung ra CSV
```bash
cd abgPortal/abg-alumni-connect
npx tsx scripts/content-export-csv.ts
# Output: scripts/content/vi-content-export.csv
```

### Import CSV đã chỉnh sửa vào code
```bash
# Xem trước thay đổi (không ghi file)
npx tsx scripts/content-import-csv.ts --dry-run

# Áp dụng thay đổi
npx tsx scripts/content-import-csv.ts
# File vi.ts.backup được tạo tự động trước khi ghi đè
```
