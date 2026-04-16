'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { linkifyText } from '@/lib/linkify';
import { normalizeMarkdown } from '@/lib/normalize-markdown';

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mt-10 mb-4">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-12 mb-4">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mt-8 mb-3">
      {children}
    </h3>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-brand-light pl-6 my-8 italic text-gray-600">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a href={href} className="text-brand-light underline hover:text-brand"
      target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  img: ({ src, alt }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt ?? ''} className="rounded-xl w-full my-6" />
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-6 space-y-2 my-4">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-6 space-y-2 my-4">{children}</ol>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-gray-900">{children}</strong>
  ),
};

interface ArticleMarkdownProps {
  content: string;
  className?: string;
}

/** Shared markdown renderer used by the live article page and the admin preview. */
export function ArticleMarkdown({ content, className }: ArticleMarkdownProps) {
  const rendered = linkifyText(normalizeMarkdown(content || ''));
  return (
    <div
      className={
        className ??
        'prose prose-lg max-w-none text-gray-700 prose-p:leading-relaxed'
      }
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {rendered}
      </ReactMarkdown>
    </div>
  );
}
