#!/usr/bin/env python3
"""
Fetch ABG members CSV from Google Sheets and generate SQL INSERT statements
for the Supabase members table.

Usage:
  python3 scripts/csv-to-supabase-sql.py
  # Or with a local CSV file:
  python3 scripts/csv-to-supabase-sql.py --file /path/to/members.csv

Output: supabase/seed-members.sql
"""

import csv
import io
import sys
import uuid
import argparse
from datetime import datetime

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQsjUwxZi5rBKiIUaqlGyiawikUSGs7REHQeSl7QXyFnNp1It6QN23JnbL90FA05FtubNMZXO-knskl/pub?gid=0&single=true&output=csv"

# CSV column indices (from header_map.json inspection)
# 0: Submission ID
# 1: Respondent ID
# 2: Submitted at
# 3: Full name
# 4: ABG Class
# 5: Email
# 6: Avatar URL
# 7: City
# 8: Contact channel
# 9: Phone
# 10: Facebook link
# 11: LinkedIn link
# 12: Company
# 13: Company website
# 14: Company industry
# 15: Role/Position
# 16: Sharing topics (can help with)
# 17: Learning topics (looking for)
# 18: Extra bio

OUTPUT_PATH = "supabase/seed-members.sql"


def escape_sql(value: str) -> str:
    """Escape single quotes for SQL string literals."""
    if not value:
        return ""
    return value.replace("'", "''").strip()


def parse_csv_rows(text: str) -> list[list[str]]:
    """Parse CSV text into rows."""
    reader = csv.reader(io.StringIO(text))
    return list(reader)


def normalize_timestamp(raw: str) -> str:
    """Convert various date formats to ISO 8601 for PostgreSQL TIMESTAMPTZ."""
    if not raw:
        return datetime.now().isoformat()
    # Already valid format like "2025-10-15 06:58:50"
    try:
        datetime.strptime(raw, "%Y-%m-%d %H:%M:%S")
        return raw
    except ValueError:
        pass
    # Try "Oct 15, 06:58" or "Sep 29, 06:21" (missing year)
    try:
        parsed = datetime.strptime(raw, "%b %d, %H:%M")
        return parsed.replace(year=2025).strftime("%Y-%m-%d %H:%M:%S")
    except ValueError:
        pass
    # Try other common formats
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%m/%d/%Y %H:%M:%S", "%b %d, %Y %H:%M"):
        try:
            parsed = datetime.strptime(raw, fmt)
            return parsed.strftime("%Y-%m-%d %H:%M:%S")
        except ValueError:
            continue
    # Fallback to now
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def build_insert(row: list[str]) -> str | None:
    """Build a single INSERT statement from a CSV row."""
    def get(idx: int) -> str:
        if idx < len(row):
            return row[idx].strip()
        return ""

    name = get(3)
    email = get(5)
    if not name or not email:
        return None

    member_id = get(0) or str(uuid.uuid4())[:8]
    raw_date = get(2)
    created_at = normalize_timestamp(raw_date)
    abg_class = get(4)
    avatar_url = get(6)
    city = get(7)
    phone = get(9)
    facebook_url = get(10)
    linkedin_url = get(11)
    company = get(12)
    company_website = get(13)
    expertise = get(14)
    role = get(15)
    can_help_with = get(16)
    looking_for = get(17)
    bio = get(18)

    # Combine city into country field if no separate country column
    country = city  # CSV city field often contains "City, Country" info

    return (
        f"INSERT INTO members "
        f"(id, name, email, role, company, expertise, can_help_with, looking_for, "
        f"bio, avatar_url, status, paid, free_requests_used, created_at, "
        f"phone, facebook_url, linkedin_url, company_website, country, "
        f"abg_class, approval_status, is_csv_imported) VALUES ("
        f"'{escape_sql(member_id)}', "
        f"'{escape_sql(name)}', "
        f"'{escape_sql(email)}', "
        f"'{escape_sql(role)}', "
        f"'{escape_sql(company)}', "
        f"'{escape_sql(expertise)}', "
        f"'{escape_sql(can_help_with)}', "
        f"'{escape_sql(looking_for)}', "
        f"'{escape_sql(bio)}', "
        f"'{escape_sql(avatar_url)}', "
        f"'active', "
        f"false, "
        f"0, "
        f"'{escape_sql(created_at)}', "
        f"'{escape_sql(phone)}', "
        f"'{escape_sql(facebook_url)}', "
        f"'{escape_sql(linkedin_url)}', "
        f"'{escape_sql(company_website)}', "
        f"'{escape_sql(country)}', "
        f"'{escape_sql(abg_class)}', "
        f"'approved', "
        f"true"
        f") ON CONFLICT (email) DO NOTHING;"
    )


def main():
    parser = argparse.ArgumentParser(description="Convert ABG CSV to Supabase SQL")
    parser.add_argument("--file", help="Path to local CSV file (skips download)")
    args = parser.parse_args()

    if args.file:
        print(f"Reading local CSV: {args.file}")
        with open(args.file, "r", encoding="utf-8-sig") as f:
            csv_text = f.read()
    else:
        if not HAS_REQUESTS:
            print("ERROR: 'requests' package not installed. Use --file flag or: pip install requests")
            sys.exit(1)
        print(f"Fetching CSV from Google Sheets...")
        resp = requests.get(CSV_URL, timeout=30)
        resp.raise_for_status()
        resp.encoding = "utf-8"
        csv_text = resp.text

    rows = parse_csv_rows(csv_text)
    if len(rows) < 2:
        print("ERROR: CSV has no data rows")
        sys.exit(1)

    header = rows[0]
    data_rows = rows[1:]
    print(f"Found {len(data_rows)} data rows, {len(header)} columns")

    # Build SQL
    lines = [
        "-- ==============================================",
        "-- Seed ABG members from Google Sheets CSV export",
        f"-- Generated: {datetime.now().isoformat()}",
        f"-- Rows: {len(data_rows)}",
        "-- ==============================================",
        "",
        "-- Admin user",
        "INSERT INTO members (id, name, email, role, company, expertise, can_help_with, "
        "looking_for, bio, status, paid, approval_status, is_admin, abg_class) VALUES ("
        "'diep_admin', 'Diep Vic', 'diepvic@gmail.com', 'Admin', 'ABG', "
        "'Everything', 'Everything', 'Nothing', 'Admin User', "
        "'active', true, 'approved', true, 'Admin'"
        ") ON CONFLICT (email) DO NOTHING;",
        "",
        "-- CSV imported members",
    ]

    count = 0
    skipped = 0
    for row in data_rows:
        sql = build_insert(row)
        if sql:
            lines.append(sql)
            count += 1
        else:
            skipped += 1

    lines.append("")
    lines.append(f"-- Total: {count} members inserted, {skipped} skipped (missing name/email)")

    output = "\n".join(lines) + "\n"

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        f.write(output)

    print(f"\nGenerated: {OUTPUT_PATH}")
    print(f"  {count} members + 1 admin user")
    print(f"  {skipped} rows skipped")
    print(f"\nNext: Paste this SQL into Supabase SQL Editor (after running the migration)")


if __name__ == "__main__":
    main()
