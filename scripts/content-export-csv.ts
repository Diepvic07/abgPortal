/**
 * Export Vietnamese translations to CSV grouped by page context.
 * Output: scripts/content/vi-content-export.csv
 *
 * Usage: npx tsx scripts/content-export-csv.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { en } from '../lib/i18n/translations/en';
import { vi } from '../lib/i18n/translations/vi';

// Page-grouped sections with friendly labels and descriptions
const PAGE_GROUPS: {
  page: string;
  description: string;
  sections: string[];
}[] = [
  {
    page: '🌐 Thanh điều hướng & Chân trang (Mọi trang)',
    description: 'Menu trên cùng, logo, nút đăng nhập, chân trang — hiển thị trên mọi trang',
    sections: ['nav', 'footer', 'language'],
  },
  {
    page: '🔑 Đăng nhập / Xác thực',
    description: 'Các thông báo đăng nhập, đăng xuất, lỗi phiên',
    sections: ['auth'],
  },
  {
    page: '🏠 Trang chủ (/)',
    description: 'Trang đầu tiên người dùng thấy — hero banner, giới thiệu, cách hoạt động, tìm kiếm công khai',
    sections: ['landing'],
  },
  {
    page: '📝 Đăng ký / Tạo hồ sơ (/onboard, /signup)',
    description: 'Form đăng ký thành viên mới — điền thông tin cá nhân, chuyên môn',
    sections: ['onboard'],
  },
  {
    page: '🔍 Tìm kết nối (/request)',
    description: 'Trang nhập yêu cầu tìm người — mô tả nhu cầu, chọn loại kết nối',
    sections: ['request'],
  },
  {
    page: '🤝 Kết quả ghép đôi',
    description: 'Hiển thị sau khi tìm kiếm — danh sách người phù hợp, nút gửi giới thiệu',
    sections: ['matches'],
  },
  {
    page: '❤️ Hẹn hò & Tuyển dụng (/request)',
    description: 'Tab hẹn hò, tìm việc, tuyển dụng trên trang tìm kết nối',
    sections: ['dating'],
  },
  {
    page: '👤 Hồ sơ cá nhân (/profile)',
    description: 'Trang xem và chỉnh sửa hồ sơ — thông tin, chuyên môn, cài đặt riêng tư',
    sections: ['profile'],
  },
  {
    page: '📰 Tin tức (/news)',
    description: 'Danh sách bài viết, bộ lọc danh mục, chi tiết bài viết',
    sections: ['news'],
  },
  {
    page: '📋 Lịch sử kết nối (/history)',
    description: 'Lịch sử yêu cầu đã gửi và người kết nối với mình',
    sections: ['history', 'myRequests'],
  },
  {
    page: '💳 Thanh toán',
    description: 'Modal thanh toán — thông tin chuyển khoản, xác nhận',
    sections: ['payment'],
  },
  {
    page: '📧 Email tự động',
    description: 'Nội dung email gửi tự động — chào mừng, giới thiệu kết nối',
    sections: ['email'],
  },
  {
    page: '⚠️ Trang lỗi',
    description: 'Thông báo khi có lỗi xảy ra',
    sections: ['errorPage'],
  },
  {
    page: '🔧 Chung (Dùng nhiều nơi)',
    description: 'Nút bấm, thông báo chung xuất hiện ở nhiều trang',
    sections: ['common'],
  },
];

// Flatten nested object to dot-notation key-value pairs
function flatten(
  obj: Record<string, unknown>,
  prefix = ''
): { key: string; value: string }[] {
  const result: { key: string; value: string }[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      result.push(...flatten(v as Record<string, unknown>, fullKey));
    } else {
      result.push({ key: fullKey, value: String(v) });
    }
  }
  return result;
}

// Get value by dot-notation key from nested object
function getByPath(obj: Record<string, unknown>, path: string): string {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return '';
    }
  }
  return String(current);
}

// Escape CSV value
function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function main() {
  const enFlat = flatten(en as unknown as Record<string, unknown>);
  const rows: string[] = [];

  // CSV header
  rows.push(
    'Trang,Mô tả trang,Key,Tiếng Anh (tham khảo),Tiếng Việt hiện tại,Tiếng Việt mới (CHỈNH SỬA CỘT NÀY)'
  );

  for (const group of PAGE_GROUPS) {
    // Collect all keys for this page group
    const pageKeys = enFlat.filter((entry) =>
      group.sections.some(
        (section) =>
          entry.key === section || entry.key.startsWith(`${section}.`)
      )
    );

    if (pageKeys.length === 0) continue;

    // Add section separator row
    rows.push(
      `${csvEscape(`--- ${group.page} ---`)},${csvEscape(group.description)},,,,`
    );

    for (const entry of pageKeys) {
      const enValue = entry.value;
      const viValue = getByPath(
        vi as unknown as Record<string, unknown>,
        entry.key
      );
      rows.push(
        [
          csvEscape(group.page),
          csvEscape(group.description),
          csvEscape(entry.key),
          csvEscape(enValue),
          csvEscape(viValue),
          csvEscape(viValue), // Pre-fill with current value for editing
        ].join(',')
      );
    }
  }

  // Write output
  const outDir = path.join(__dirname, 'content');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, 'vi-content-export.csv');
  // Add BOM for Excel UTF-8 compatibility
  fs.writeFileSync(outPath, '\ufeff' + rows.join('\n'), 'utf-8');

  console.log(`Exported ${rows.length - 1} rows to: ${outPath}`);
  console.log(`\nPage groups:`);
  for (const group of PAGE_GROUPS) {
    const count = enFlat.filter((e) =>
      group.sections.some(
        (s) => e.key === s || e.key.startsWith(`${s}.`)
      )
    ).length;
    console.log(`  ${group.page}: ${count} strings`);
  }
}

main();
