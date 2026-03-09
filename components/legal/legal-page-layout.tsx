'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { useTranslation } from '@/lib/i18n';

interface LegalPageLayoutProps {
  contentVi: string;
  contentEn: string;
}

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-3xl font-bold text-gray-900 mb-6">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="text-gray-700 leading-relaxed mb-4">{children}</p>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-brand-light pl-6 my-6 italic text-gray-600">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-brand-light underline hover:text-brand"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-6 space-y-2 my-4">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-6 space-y-2 my-4">{children}</ol>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-6">
      <table className="min-w-full border border-gray-200 text-sm">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-gray-50">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="border border-gray-200 px-4 py-2 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-gray-200 px-4 py-2">{children}</td>
  ),
};

export function LegalPageLayout({ contentVi, contentEn }: LegalPageLayoutProps) {
  const { locale } = useTranslation();
  const content = locale === 'vi' ? contentVi : contentEn;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="prose prose-lg max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{content}</ReactMarkdown>
      </div>
    </div>
  );
}
