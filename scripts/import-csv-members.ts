/**
 * CSV Member Import Script
 * Imports existing CSV members with pre-approved status
 *
 * Usage:
 *   npm run import-members -- --dry-run    # Preview without writing
 *   npm run import-members                  # Actual import
 */

import { parse } from "csv-parse/sync";
import * as fs from "fs";
import * as path from "path";
import { Member } from "../types";
import { addMember, getMemberByEmail } from "../lib/google-sheets";
import { generateId, formatDate } from "../lib/utils";

// CSV column headers (Vietnamese)
interface CsvRow {
  "Submission ID": string;
  "Respondent ID": string;
  "Submitted at": string;
  "Họ và tên": string;
  "Học viên khoá ABG?": string;
  "Email hay sử dụng. Lưu ý email này sẽ được sử dụng để đăng nhập cổng danh bạ thành viên ABG Alumni về sau.": string;
  "Một đường link đến hình ảnh cá nhân của bạn, yêu cầu nhìn rõ mặt. Bạn có thể click chuột phải trên avatar của Facebook và Linkedin, sau đó dán đường link public đến hình ảnh của bạn vào ô bên dưới (ví dụ: https://media.licdn.com/dms/image/v2/D5603AQG4K6IFxf60dQ/profile-displayphoto-shrink_200_200/profile-displayphoto-shrink_200_200/0/1729313306776?e=1761177600&v=beta&t=DEhU-n3SB9IfAqf35_Tt13MZEr_TxA2hr5lHIBijfrI)": string;
  "Thành phố bạn đang sinh sống hiện tại. Nếu bạn ở nước ngoài, vui lòng điền thông tin gồm cả thành phố và quốc gia. Ví dụ: TPHCM/Hà Nội/Bangkok, Thái Lan/Durham, Mỹ.": string;
  "Bạn muốn các thành viên trong ABG Alumni kết nối với bạn qua kênh nào?": string;
  "Số điện thoại của bạn": string;
  "Đường link dẫn đến trang Facebook cá nhân của bạn (ví dụ: https://www.facebook.com/ttvietduc)": string;
  "Nếu muốn chia sẻ trang LinkedIn dẫn đến hồ sơ nghề nghiệp của bạn, vui lòng nhập đường dẫn đến trang cá nhân của bạn trên LinkedIn (ví dụ: https://www.linkedin.com/in/ttvietduc/)": string;
  "Tổ chức/doanh nghiệp bạn đang làm việc?": string;
  "Đường dẫn đến website/trang mạng xã hội chính thức của tổ chức/doanh nghiệp bạn đang làm việc. Mọi người có thể tìm hiểu thêm về tổ chức/doanh nghiệp của bạn nhờ thông tin này.": string;
  "Lĩnh vực của tổ chức bạn đang làm việc? (Ví dụ nếu bạn đang là Marketing Manager của một trung tâm tiếng Anh, bạn vui lòng điền giáo dục/đào tạo tiếng Anh... vào ô bên dưới)": string;
  "Vị trí của bạn tại tổ chức bạn đang làm việc? (Ví dụ nếu bạn đang là Marketing Manager của một cơ sở giáo dục, bạn vui lòng điền Marketing Manager vào ô bên dưới)": string;
  "Ít nhất 3 điều mà bạn có thể sẵn sàng chia sẻ cho ABG Alumni, không nhất thiết phải liên quan đến công việc (ví dụ chuyên môn/kỹ năng/kinh nghiệm chơi thể thao/xây dựng mối quan hệ/gia đình con cái...)": string;
  "Ít nhất 3 điều mà bạn đang muốn học hỏi thêm, không nhất thiết phải liên quan đến công việc (ví dụ chuyên môn/kỹ năng/chơi thể thao/xây dựng mối quan hệ/gia đình con cái...)": string;
  "Bạn có thể giới thiệu thêm về bản thân để các thành viên khác trong cộng đồng hiểu rõ hơn về bạn. Bạn có thể điền bất cứ nội dung gì ở đây (lý do đến với ABG/sở thích/dự định trong tương lai...)": string;
  "Quốc gia": string;
}

const CSV_PATH = path.join(__dirname, "../docs/abg_members_portal_data_sample.csv");
const DRY_RUN = process.argv.includes("--dry-run");

// Column key shortcuts
const COL = {
  EMAIL: "Email hay sử dụng. Lưu ý email này sẽ được sử dụng để đăng nhập cổng danh bạ thành viên ABG Alumni về sau.",
  AVATAR: "Một đường link đến hình ảnh cá nhân của bạn, yêu cầu nhìn rõ mặt. Bạn có thể click chuột phải trên avatar của Facebook và Linkedin, sau đó dán đường link public đến hình ảnh của bạn vào ô bên dưới (ví dụ: https://media.licdn.com/dms/image/v2/D5603AQG4K6IFxf60dQ/profile-displayphoto-shrink_200_200/profile-displayphoto-shrink_200_200/0/1729313306776?e=1761177600&v=beta&t=DEhU-n3SB9IfAqf35_Tt13MZEr_TxA2hr5lHIBijfrI)",
  CITY: "Thành phố bạn đang sinh sống hiện tại. Nếu bạn ở nước ngoài, vui lòng điền thông tin gồm cả thành phố và quốc gia. Ví dụ: TPHCM/Hà Nội/Bangkok, Thái Lan/Durham, Mỹ.",
  PHONE: "Số điện thoại của bạn",
  FACEBOOK: "Đường link dẫn đến trang Facebook cá nhân của bạn (ví dụ: https://www.facebook.com/ttvietduc)",
  LINKEDIN: "Nếu muốn chia sẻ trang LinkedIn dẫn đến hồ sơ nghề nghiệp của bạn, vui lòng nhập đường dẫn đến trang cá nhân của bạn trên LinkedIn (ví dụ: https://www.linkedin.com/in/ttvietduc/)",
  COMPANY: "Tổ chức/doanh nghiệp bạn đang làm việc?",
  COMPANY_WEBSITE: "Đường dẫn đến website/trang mạng xã hội chính thức của tổ chức/doanh nghiệp bạn đang làm việc. Mọi người có thể tìm hiểu thêm về tổ chức/doanh nghiệp của bạn nhờ thông tin này.",
  EXPERTISE: "Lĩnh vực của tổ chức bạn đang làm việc? (Ví dụ nếu bạn đang là Marketing Manager của một trung tâm tiếng Anh, bạn vui lòng điền giáo dục/đào tạo tiếng Anh... vào ô bên dưới)",
  ROLE: "Vị trí của bạn tại tổ chức bạn đang làm việc? (Ví dụ nếu bạn đang là Marketing Manager của một cơ sở giáo dục, bạn vui lòng điền Marketing Manager vào ô bên dưới)",
  CAN_HELP: "Ít nhất 3 điều mà bạn có thể sẵn sàng chia sẻ cho ABG Alumni, không nhất thiết phải liên quan đến công việc (ví dụ chuyên môn/kỹ năng/kinh nghiệm chơi thể thao/xây dựng mối quan hệ/gia đình con cái...)",
  LOOKING_FOR: "Ít nhất 3 điều mà bạn đang muốn học hỏi thêm, không nhất thiết phải liên quan đến công việc (ví dụ chuyên môn/kỹ năng/chơi thể thao/xây dựng mối quan hệ/gia đình con cái...)",
  BIO: "Bạn có thể giới thiệu thêm về bản thân để các thành viên khác trong cộng đồng hiểu rõ hơn về bạn. Bạn có thể điền bất cứ nội dung gì ở đây (lý do đến với ABG/sở thích/dự định trong tương lai...)",
} as const;

async function importMembers() {
  console.log("=".repeat(50));
  console.log(DRY_RUN ? "DRY RUN - No changes will be made" : "IMPORTING MEMBERS");
  console.log("=".repeat(50));

  // Read CSV file
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV file not found: ${CSV_PATH}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(CSV_PATH, "utf-8");
  const records: CsvRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true, // Handle BOM if present
  });

  console.log(`Found ${records.length} records in CSV\n`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of records) {
    const email = row[COL.EMAIL]?.trim().toLowerCase();
    const name = row["Họ và tên"]?.trim();

    if (!email) {
      console.log(`[SKIP] Row with no email: ${name || "Unknown"}`);
      skipped++;
      continue;
    }

    try {
      // Check if already exists
      const existing = await getMemberByEmail(email);
      if (existing) {
        console.log(`[SKIP] Already exists: ${email}`);
        skipped++;
        continue;
      }

      const member: Member = {
        id: generateId(),
        name: name || "",
        email: email,
        role: row[COL.ROLE] || "",
        company: row[COL.COMPANY] || "",
        expertise: row[COL.EXPERTISE] || "",
        can_help_with: row[COL.CAN_HELP] || "",
        looking_for: row[COL.LOOKING_FOR] || "",
        bio: row[COL.BIO] || "",
        avatar_url: row[COL.AVATAR] || undefined,
        status: "active",
        paid: false, // All imported as basic tier
        free_requests_used: 0,
        created_at: formatDate(),
        phone: row[COL.PHONE] || undefined,
        facebook_url: row[COL.FACEBOOK] || undefined,
        linkedin_url: row[COL.LINKEDIN] || undefined,
        company_website: row[COL.COMPANY_WEBSITE] || undefined,
        country: row["Quốc gia"] || "Việt Nam",
        abg_class: row["Học viên khoá ABG?"] || undefined,
        // Auth fields
        auth_provider: "magic_link",
        account_status: "active",
        total_requests_count: 0,
        requests_today: 0,
        // New approval fields - pre-approved for CSV imports
        approval_status: "approved",
        is_csv_imported: true,
        payment_status: "unpaid",
      };

      if (DRY_RUN) {
        console.log(`[DRY] Would import: ${email} (${name})`);
      } else {
        await addMember(member);
        console.log(`[OK] Imported: ${email} (${name})`);
      }
      imported++;

      // Rate limit to avoid API throttling (500ms between writes)
      if (!DRY_RUN) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

    } catch (error) {
      console.error(`[ERROR] ${email}: ${error instanceof Error ? error.message : error}`);
      errors++;
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("IMPORT SUMMARY");
  console.log("=".repeat(50));
  console.log(`Total records: ${records.length}`);
  console.log(`Imported:      ${imported}`);
  console.log(`Skipped:       ${skipped}`);
  console.log(`Errors:        ${errors}`);
  if (DRY_RUN) {
    console.log("\nThis was a DRY RUN. Run without --dry-run to import.");
  }
}

importMembers().catch(error => {
  console.error("Import failed:", error);
  process.exit(1);
});
