import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';

interface ArticleContentProps {
  content: string;
}

const components: Components = {
  a: ({ href, children }) => (
    <a href={href} className="text-blue-600 underline hover:text-blue-800" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  img: ({ src, alt }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt ?? ''} className="rounded-lg w-full my-4" />
  ),
};

export function ArticleContent({ content }: ArticleContentProps) {
  return (
    <div className="prose prose-lg max-w-none text-gray-700">
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  );
}
