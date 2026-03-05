import type { Metadata } from 'next';
import fs from 'fs/promises';
import path from 'path';
import { LegalPageLayout } from '@/components/legal/legal-page-layout';

export const metadata: Metadata = {
  title: 'Privacy Policy | ABG Alumni Connect',
  description:
    'Privacy Policy for ABG Alumni Connect - how we collect, use, and protect your personal data.',
};

export default async function PrivacyPage() {
  const basePath = path.join(process.cwd(), 'content/legal');
  const [contentVi, contentEn] = await Promise.all([
    fs.readFile(path.join(basePath, 'privacy-policy.vi.md'), 'utf-8'),
    fs.readFile(path.join(basePath, 'privacy-policy.en.md'), 'utf-8'),
  ]);

  return <LegalPageLayout contentVi={contentVi} contentEn={contentEn} />;
}
