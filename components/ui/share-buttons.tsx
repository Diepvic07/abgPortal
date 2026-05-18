'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';

interface ShareButtonsProps {
  title?: string;
}

export function ShareButtons({ title }: ShareButtonsProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  function shareFacebook() {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400');
  }

  function shareMessenger() {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/dialog/send?link=${url}&app_id=291494419107518&redirect_uri=${url}`, '_blank', 'width=600,height=400');
  }

  function shareZalo() {
    const url = encodeURIComponent(window.location.href);
    const text = title ? encodeURIComponent(title) : '';
    window.open(`https://zalo.me/share?url=${url}&title=${text}`, '_blank', 'width=600,height=400');
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard may not be available */ }
  }

  return (
    <div className="flex items-center gap-1">
      {/* Facebook */}
      <button onClick={shareFacebook} title={t.news.shareFacebook}
        className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-[#1877F2]">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </button>
      {/* Messenger */}
      <button onClick={shareMessenger} title={t.news.shareMessenger}
        className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-[#0099FF]">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.301 2.246.464 3.443.464 6.627 0 12-4.975 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8.2l3.131 3.26 5.886-3.26-6.558 6.763z" />
        </svg>
      </button>
      {/* Zalo */}
      <button onClick={shareZalo} title={t.news.shareZalo}
        className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-[#0068FF]">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16c-.18-.422-.7-.702-.7-.702S14.42 5.855 13.3 5.27c-.408-.213-.78-.105-.96.116-.205.251-.78 1.008-.78 1.008s-.372.452.14.884c.513.433 1.337.986 1.337.986s-.637.06-1.404-.363c-.86-.474-2.063-1.505-2.063-1.505s-.302-.252-.603.14c-.302.392-.906 1.172-.906 1.172s-.352.412.21.844l2.063 1.505s-1.026.1-1.754-.256c-1.03-.502-1.507-.836-1.507-.836s-.403-.286-.642.176c-.24.462-.453.835-.453.835s-.167.36.303.603c.47.242 2.527 1.263 4.41 1.123 1.884-.14 3.428-1.044 3.428-1.044s.352-.222.06-.704zM7.2 14.4h4.397s.503-.02.503.482v.238s.02.48-.503.48H8.684l3.353 3.813s.362.362-.04.362h-.602s-.402-.01-.643-.322l-2.869-3.25v3.09s.02.482-.503.482h-.22s-.482.02-.482-.482v-4.411s-.02-.482.522-.482zm6.063 0h.582s.482-.02.482.482v4.411s.02.482-.482.482h-.582s-.482.02-.482-.482v-4.411s-.02-.482.482-.482zm2.204 0c1.545 0 2.797 1.207 2.797 2.696 0 1.488-1.252 2.695-2.797 2.695s-2.797-1.207-2.797-2.695c0-1.49 1.252-2.696 2.797-2.696zm0 1.003c-.961 0-1.74.758-1.74 1.693 0 .936.779 1.694 1.74 1.694.962 0 1.74-.758 1.74-1.694 0-.935-.778-1.693-1.74-1.693z" />
        </svg>
      </button>
      {/* Copy link */}
      <button onClick={copyLink} title={copied ? t.news.linkCopied : t.news.copyLink}
        className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${copied ? 'text-green-500' : 'text-gray-400 hover:text-gray-600'}`}>
        {copied ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        )}
      </button>
    </div>
  );
}
