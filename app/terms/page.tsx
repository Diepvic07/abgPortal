import type { Metadata } from 'next';
import fs from 'fs/promises';
import path from 'path';
import { LegalPageLayout } from '@/components/legal/legal-page-layout';

export const metadata: Metadata = {
  title: 'Terms of Service | ABG Alumni Connect',
  description:
    'Terms of Service for ABG Alumni Connect platform - membership, usage rules, and legal terms.',
};

export default async function TermsPage() {
  const basePath = path.join(process.cwd(), 'content/legal');
  const [contentVi, contentEn] = await Promise.all([
    fs.readFile(path.join(basePath, 'terms-of-service.vi.md'), 'utf-8'),
    fs.readFile(path.join(basePath, 'terms-of-service.en.md'), 'utf-8'),
  ]);

  return <LegalPageLayout contentVi={contentVi} contentEn={contentEn} />;
}
