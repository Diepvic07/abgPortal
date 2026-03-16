'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

const FacebookIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

export function FooterSection() {
  const { t } = useTranslation();

  return (
    <footer className="bg-slate-900 pt-20 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 4-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          {/* Col 1: Brand */}
          <div>
            <div className="flex items-center space-x-2 text-white mb-6">
              <Image
                src="/images/abg_white_logo.png"
                alt="ABG Logo"
                width={269}
                height={103}
                className="h-9 w-auto object-contain"
              />
              <span className="text-lg font-bold tracking-tight">ABG Alumni</span>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed">
              {t.footer.description}
            </p>
          </div>

          {/* Col 2: Platform */}
          <div>
            <h4 className="text-white font-bold mb-6">{t.footer.platform}</h4>
            <ul className="space-y-4 text-slate-500 text-sm">
              <li>
                <Link href="/members" className="hover:text-white transition-colors">{t.footer.directory}</Link>
              </li>
              <li>
                <Link href="/news" className="hover:text-white transition-colors">{t.footer.newsFeed}</Link>
              </li>
              <li>
                <Link href="/request" className="hover:text-white transition-colors">{t.footer.connections}</Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Company */}
          <div>
            <h4 className="text-white font-bold mb-6">{t.footer.company}</h4>
            <ul className="space-y-4 text-slate-500 text-sm">
              <li>
                <Link href="/about" className="hover:text-white transition-colors">{t.footer.about}</Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-white transition-colors">{t.footer.faqLink}</Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">{t.footer.privacy}</Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Stay Connected */}
          <div>
            <h4 className="text-white font-bold mb-6">{t.footer.stayConnected}</h4>
            <div className="flex space-x-4 mb-6">
              <a
                href="https://www.facebook.com/ABGAlumni"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#1877F2] transition-all"
                aria-label="Facebook"
              >
                <FacebookIcon />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center text-slate-500 text-xs text-center md:text-left">
          <p>{t.footer.copyright}</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link href="/terms" className="hover:text-white transition-colors">{t.footer.terms}</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">{t.footer.privacy}</Link>
            <Link href="/data-policy" className="hover:text-white transition-colors">{t.footer.dataPolicy || 'Data Policy'}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
