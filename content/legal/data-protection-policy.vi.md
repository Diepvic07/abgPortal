# Chính Sách Bảo Vệ Dữ Liệu Cá Nhân

**Nền tảng:** ABG Alumni Connect
**Cập nhật lần cuối:** 05/03/2026
**Phiên bản:** 1.0

---

## 1. Cam Kết Bảo Vệ Dữ Liệu

ABG Alumni ("chúng tôi") cam kết bảo vệ dữ liệu cá nhân của tất cả thành viên sử dụng nền tảng ABG Alumni Connect. Chính sách này được xây dựng tuân thủ theo:

- **Nghị định 13/2023/NĐ-CP** về bảo vệ dữ liệu cá nhân
- **Luật An ninh mạng 2018** (Luật số 24/2018/QH14)
- Các quy định pháp luật liên quan của nước Cộng hòa Xã hội Chủ nghĩa Việt Nam

Chúng tôi thu thập, lưu trữ và xử lý dữ liệu cá nhân với mục đích duy nhất là cung cấp và cải thiện dịch vụ kết nối cộng đồng cựu sinh viên ABG. Mọi hoạt động xử lý dữ liệu đều được thực hiện trên cơ sở hợp pháp, minh bạch và có sự đồng ý rõ ràng của người dùng.

---

## 2. Phạm Vi Áp Dụng

Chính sách này áp dụng cho:

- Tất cả thành viên đã đăng ký và được phê duyệt trên nền tảng ABG Alumni Connect
- Người dùng đang trong quá trình đăng ký tài khoản
- Khách truy cập trang web công khai của nền tảng
- Bất kỳ cá nhân nào tương tác với hệ thống thông qua các tính năng của nền tảng

Chính sách này bao gồm toàn bộ vòng đời của dữ liệu cá nhân: từ thời điểm thu thập, lưu trữ, xử lý, đến khi xóa theo yêu cầu hoặc theo quy định.

---

## 3. Phân Loại Dữ Liệu Thu Thập

### 3.1. Dữ Liệu Cá Nhân Cơ Bản

Dữ liệu nhận dạng và liên lạc được thu thập khi đăng ký và sử dụng nền tảng:

- Họ và tên đầy đủ
- Địa chỉ email
- Số điện thoại
- Vai trò trong cộng đồng ABG (thành viên, mentor, v.v.)
- Thông tin công ty / tổ chức đang làm việc
- Lĩnh vực chuyên môn và kỹ năng
- Ảnh đại diện (avatar)
- Thông tin tiểu sử cá nhân (bio)

### 3.2. Dữ Liệu Nhạy Cảm

Các dữ liệu thuộc danh mục nhạy cảm theo Nghị định 13/2023/NĐ-CP, được thu thập riêng cho tính năng **Love Match** (kết nối bạn đời):

- Tình trạng hôn nhân / mối quan hệ
- Bản dạng giới tính
- Sở thích kết bạn và đối tượng tìm kiếm

> **Lưu ý:** Dữ liệu nhạy cảm chỉ được thu thập với sự đồng ý tường minh, riêng biệt và chỉ hiển thị cho các thành viên đã bật tính năng Love Match.

### 3.3. Dữ Liệu Kỹ Thuật

Dữ liệu phát sinh trong quá trình sử dụng nền tảng:

- Token xác thực (JWT) và phiên làm việc (session)
- Địa chỉ IP (được ghi nhận thông qua cơ chế giới hạn tốc độ - rate limiting)
- Dữ liệu phiên trình duyệt
- Nhật ký hoạt động quản trị (admin audit logs)

---

## 4. Biện Pháp Bảo Vệ Kỹ Thuật

ABG Alumni áp dụng các biện pháp bảo vệ kỹ thuật sau:

### 4.1. Kiểm Soát Truy Cập Cơ Sở Dữ Liệu

- **Supabase Row Level Security (RLS):** Chính sách bảo mật cấp hàng dữ liệu đảm bảo mỗi người dùng chỉ truy cập được dữ liệu được phép của mình
- Phân tách rõ ràng giữa dữ liệu công khai và dữ liệu riêng tư
- Quyền truy cập cơ sở dữ liệu được cấp theo nguyên tắc đặc quyền tối thiểu

### 4.2. Xác Thực và Phân Quyền

- **NextAuth JWT:** Token xác thực với thời hạn 30 ngày, ký số an toàn
- Hệ thống phân quyền nhiều cấp: thành viên, admin, super admin
- Phê duyệt thủ công cho tài khoản mới trước khi được cấp quyền truy cập

### 4.3. Mã Hóa và Truyền Tải Dữ Liệu

- **HTTPS:** Toàn bộ dữ liệu được mã hóa trong quá trình truyền tải
- Dữ liệu lưu trữ được mã hóa bởi nhà cung cấp dịch vụ đám mây
- Không lưu trữ mật khẩu dạng văn bản thuần túy

### 4.4. Giới Hạn Tốc Độ (Rate Limiting)

- Áp dụng giới hạn tốc độ trên các API endpoint quan trọng
- Ngăn chặn tấn công brute force và lạm dụng dịch vụ
- Địa chỉ IP vi phạm có thể bị tạm khóa tự động

### 4.5. Bảo Mật Hạ Tầng

- Hạ tầng hosting được bảo vệ bởi **Vercel** với các tiêu chuẩn bảo mật cấp doanh nghiệp
- Cập nhật bảo mật định kỳ cho toàn bộ hệ thống
- Giám sát liên tục các hoạt động bất thường

---

## 5. Biện Pháp Tổ Chức

### 5.1. Quy Trình Phê Duyệt Thành Viên

- Mọi tài khoản mới đều yêu cầu phê duyệt thủ công từ quản trị viên
- Xác minh danh tính trước khi cấp quyền truy cập đầy đủ
- Ngăn chặn truy cập trái phép vào cộng đồng

### 5.2. Quản Lý Tài Khoản Vi Phạm

- Quản trị viên có quyền tạm khóa hoặc xóa tài khoản vi phạm chính sách
- Quy trình xử lý khiếu nại và kháng nghị rõ ràng
- Thông báo cho người dùng khi tài khoản bị hạn chế

### 5.3. Nhật Ký Kiểm Toán (Audit Trail)

- Toàn bộ hành động quản trị được ghi nhận qua **Discord webhook**
- Nhật ký bao gồm: thời gian, người thực hiện, hành động, đối tượng bị tác động
- Hỗ trợ truy vết khi có sự cố hoặc khiếu nại

### 5.4. Nguyên Tắc Đặc Quyền Tối Thiểu

- Quản trị viên chỉ được cấp quyền cần thiết cho công việc của mình
- Phân cấp quyền hạn rõ ràng giữa các vai trò quản trị
- Rà soát định kỳ danh sách tài khoản có quyền quản trị

---

## 6. Xử Lý Sự Cố Dữ Liệu

Trong trường hợp xảy ra sự cố rò rỉ hoặc vi phạm dữ liệu, ABG Alumni thực hiện:

### 6.1. Thông Báo Cơ Quan Chức Năng

- Thông báo đến cơ quan có thẩm quyền **trong vòng 72 giờ** kể từ khi phát hiện sự cố, theo quy định tại **Nghị định 13/2023/NĐ-CP**
- Cung cấp đầy đủ thông tin về bản chất, phạm vi và tác động của sự cố

### 6.2. Thông Báo Người Dùng Bị Ảnh Hưởng

- Thông báo ngay lập tức đến những người dùng có dữ liệu bị ảnh hưởng
- Cung cấp hướng dẫn các biện pháp bảo vệ bổ sung cho người dùng
- Duy trì kênh liên lạc trong suốt quá trình xử lý sự cố

### 6.3. Điều Tra và Khắc Phục

- Điều tra nguyên nhân và phạm vi của sự cố
- Thực hiện các biện pháp khắc phục và vá lỗi kịp thời
- Đánh giá lại và tăng cường các biện pháp bảo mật hiện hành

### 6.4. Lưu Trữ Hồ Sơ Sự Cố

- Ghi chép đầy đủ toàn bộ diễn biến sự cố và các hành động ứng phó
- Lưu trữ hồ sơ theo quy định pháp luật
- Sử dụng bài học kinh nghiệm để cải thiện quy trình bảo mật

---

## 7. Quyền Truy Cập và Xóa Dữ Liệu

Theo quy định của **Nghị định 13/2023/NĐ-CP** và **Luật An ninh mạng 2018**, người dùng có các quyền sau:

### 7.1. Quyền Truy Cập Dữ Liệu

- Người dùng có thể xem và chỉnh sửa thông tin cá nhân trong phần **Cài đặt hồ sơ**
- Yêu cầu cung cấp bản sao toàn bộ dữ liệu cá nhân được lưu trữ

### 7.2. Quyền Yêu Cầu Xóa Dữ Liệu

- Người dùng có thể gửi yêu cầu xóa toàn bộ dữ liệu qua email: **contact@abg.vn**
- Yêu cầu xóa dữ liệu sẽ được xử lý **trong vòng 30 ngày**
- Dữ liệu sao lưu (backup) sẽ được xóa **trong vòng 90 ngày** kể từ ngày yêu cầu

### 7.3. Quyền Phản Đối và Hạn Chế Xử Lý

- Người dùng có quyền phản đối việc xử lý dữ liệu cho các mục đích cụ thể
- Yêu cầu hạn chế xử lý dữ liệu trong khi khiếu nại đang được xem xét

> **Lưu ý:** Một số dữ liệu có thể được giữ lại nếu cần thiết cho mục đích tuân thủ pháp luật hoặc giải quyết tranh chấp.

---

## 8. Chuyển Dữ Liệu Quốc Tế

ABG Alumni sử dụng các dịch vụ bên thứ ba có đặt máy chủ ngoài lãnh thổ Việt Nam. Việc chuyển dữ liệu được thực hiện theo quy định tại **Nghị định 13/2023/NĐ-CP**:

| Nhà Cung Cấp | Mục Đích | Vị Trí |
|---|---|---|
| **Supabase** | Lưu trữ cơ sở dữ liệu (database hosting) | Hạ tầng đám mây |
| **Vercel** | Hosting ứng dụng và lưu trữ ảnh (Blob storage) | Hoa Kỳ (US) |
| **Google Gemini AI** | Tính năng gợi ý kết nối bằng AI | Hoa Kỳ (US) |
| **Resend** | Gửi email giao dịch (transactional email) | Hoa Kỳ (US) |

Tất cả các nhà cung cấp trên đều tuân thủ các tiêu chuẩn bảo mật quốc tế được công nhận rộng rãi trong ngành. Người dùng được thông báo về việc chuyển giao dữ liệu này thông qua chính sách bảo vệ dữ liệu.

---

## 9. Đánh Giá Tác Động Bảo Vệ Dữ Liệu

Phù hợp với tinh thần của **Nghị định 13/2023/NĐ-CP**, ABG Alumni thực hiện đánh giá tác động định kỳ:

- Rà soát toàn bộ hoạt động xử lý dữ liệu và mức độ rủi ro
- Đánh giá các biện pháp bảo mật của nhà cung cấp dịch vụ bên thứ ba
- Theo dõi và cập nhật theo các thay đổi về quy định pháp luật
- Cập nhật chính sách và quy trình khi cần thiết
- Đánh giá tác động khi triển khai tính năng mới có xử lý dữ liệu cá nhân

---

## 10. Liên Hệ Người Chịu Trách Nhiệm Bảo Vệ Dữ Liệu

ABG Alumni là **Bên kiểm soát dữ liệu** (Data Controller) theo quy định của **Nghị định 13/2023/NĐ-CP**.

**Thông tin liên hệ:**

- **Email:** contact@abg.vn
- **Địa chỉ:** Read Station, Huỳnh Thúc Kháng, Hà Nội, Việt Nam

Mọi yêu cầu, khiếu nại hoặc câu hỏi liên quan đến dữ liệu cá nhân, vui lòng liên hệ qua email trên. Chúng tôi cam kết phản hồi trong vòng **5 ngày làm việc**.

---

## 11. Thay Đổi Chính Sách

ABG Alumni có quyền cập nhật chính sách này khi cần thiết để phản ánh các thay đổi về pháp luật, công nghệ hoặc hoạt động của nền tảng.

- Người dùng sẽ được thông báo về các thay đổi quan trọng qua email
- Phiên bản mới có hiệu lực sau **30 ngày** kể từ ngày thông báo
- Tiếp tục sử dụng nền tảng sau thời hạn trên đồng nghĩa với việc chấp nhận chính sách mới

---

*Chính sách này được ban hành bởi ABG Alumni và có hiệu lực từ ngày 05/03/2026.*
*Phiên bản tiếng Việt là phiên bản có giá trị pháp lý.*
