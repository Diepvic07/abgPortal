import type { Metadata } from 'next';
import fs from 'fs/promises';
import path from 'path';
import { LegalPageLayout } from '@/components/legal/legal-page-layout';

export const metadata: Metadata = {
  title: 'Data Protection Policy | ABG Alumni Connect',
  description:
    'Data Protection Policy for ABG Alumni Connect - our commitment to safeguarding your personal data.',
};

export default async function DataPolicyPage() {
  const basePath = path.join(process.cwd(), 'content/legal');
  const [contentVi, contentEn] = await Promise.all([
    fs.readFile(
      path.join(basePath, 'data-protection-policy.vi.md'),
      'utf-8'
    ),
    fs.readFile(
      path.join(basePath, 'data-protection-policy.en.md'),
      'utf-8'
    ),
  ]);

  return <LegalPageLayout contentVi={contentVi} contentEn={contentEn} />;
}
