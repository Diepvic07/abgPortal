'use client';

import { useState } from 'react';
import { useTranslation, interpolate } from '@/lib/i18n';
import { en } from '@/lib/i18n/translations/en';
import { vi } from '@/lib/i18n/translations/vi';

type MessageLang = 'en' | 'vi';

interface MatchIntroModalProps {
  isLove: boolean;
  targetName: string;
  requesterName: string;
  requesterClass: string;
  customIntro: string;
  onCustomIntroChange: (value: string) => void;
  isConnecting: boolean;
  error: string | null;
  success: boolean;
  onSend: () => void;
  onClose: () => void;
}

/** Generate intro text using a specific language's template */
function generateIntroText(lang: MessageLang, targetName: string, requesterName: string, requesterClass: string): string {
  const translations = lang === 'vi' ? vi : en;
  if (requesterClass) {
    return interpolate(translations.matches.matchIntroTemplate, { targetName, requesterName, requesterClass });
  }
  return interpolate(translations.matches.matchIntroTemplateFallback, { targetName, requesterName });
}

/** Check if message still contains bracket placeholders like [xxx], [yyy] */
function hasPlaceholders(text: string): boolean {
  return /\[[a-zA-Z]{1,}\]/.test(text);
}

export function MatchIntroModal({
  isLove, targetName, requesterName, requesterClass,
  customIntro, onCustomIntroChange,
  isConnecting, error, success, onSend, onClose,
}: MatchIntroModalProps) {
  const { t, locale } = useTranslation();
  const [messageLang, setMessageLang] = useState<MessageLang>(locale as MessageLang);
  const showPlaceholderWarning = !isLove && hasPlaceholders(customIntro);

  const switchLanguage = (lang: MessageLang) => {
    setMessageLang(lang);
    if (!isLove) {
      onCustomIntroChange(generateIntroText(lang, targetName, requesterName, requesterClass));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className={`px-6 pt-6 pb-4 ${isLove ? 'bg-gradient-to-br from-pink-50 to-white' : 'bg-gradient-to-br from-brand/5 to-white'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center
              ${isLove ? 'bg-pink-100 text-pink-600' : 'bg-brand/10 text-brand'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {isLove ? t.matches.sendLoveMatch : t.matches.requestIntro}
              </h2>
              <p className="text-sm text-gray-500">{t.matches.modalNotice}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 pb-6">
          {success ? (
            <div className="py-8 text-center">
              <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-3
                ${isLove ? 'bg-pink-100' : 'bg-emerald-100'}`}>
                <svg className={`w-7 h-7 ${isLove ? 'text-pink-600' : 'text-emerald-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-semibold text-gray-900">{t.matches.success.title}</p>
              <p className="text-sm text-gray-500 mt-1">{t.matches.success.message}</p>
            </div>
          ) : (
            <>
              {/* Language switch - only for non-love matches */}
              {!isLove && (
                <div className="flex items-center justify-between mt-4 mb-2">
                  <span className="text-xs font-medium text-gray-500">{t.matches.messageLanguage}</span>
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => switchLanguage('en')}
                      className={`px-3 py-1 text-xs font-medium transition-colors ${messageLang === 'en'
                        ? 'bg-brand text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      EN
                    </button>
                    <button
                      type="button"
                      onClick={() => switchLanguage('vi')}
                      className={`px-3 py-1 text-xs font-medium transition-colors border-l border-gray-200 ${messageLang === 'vi'
                        ? 'bg-brand text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      VI
                    </button>
                  </div>
                </div>
              )}

              {/* Textarea */}
              <textarea
                value={customIntro}
                onChange={(e) => onCustomIntroChange(e.target.value.slice(0, 500))}
                maxLength={500}
                rows={5}
                className={`w-full px-4 py-3 border border-gray-200 rounded-xl text-sm leading-relaxed focus:outline-none focus:ring-2 resize-none transition-shadow
                  ${isLove ? 'focus:ring-pink-400 focus:border-pink-400' : 'focus:ring-brand-light focus:border-brand-light'}
                  ${!isLove && !customIntro.trim() ? 'mt-2' : 'mt-2'}`}
                placeholder={t.matches.introPlaceholder}
              />
              <p className="text-xs text-gray-400 mt-1.5 text-right">{customIntro.length}/500</p>

              {showPlaceholderWarning && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700 mt-2 flex items-start gap-2">
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  {t.matches.placeholderWarning}
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-600 mt-2 flex items-start gap-2">
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  {t.matches.cancel}
                </button>
                <button
                  onClick={onSend}
                  disabled={isConnecting || (!isLove && !customIntro.trim()) || showPlaceholderWarning}
                  className={`flex-1 px-4 py-2.5 text-white rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all
                    ${isLove
                      ? 'bg-pink-500 hover:bg-pink-600 shadow-sm shadow-pink-500/20'
                      : 'bg-brand hover:bg-brand-light shadow-sm shadow-brand/20'
                    }`}
                >
                  {isConnecting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {t.matches.sending}
                    </span>
                  ) : t.matches.sendRequest}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
