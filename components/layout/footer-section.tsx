'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

const TwitterIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
  </svg>
);

const LinkedInIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
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
                src="/images/abg_dark_logo.png"
                alt="ABG Logo"
                width={32}
                height={32}
                className="h-8 w-auto object-contain"
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
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-blue-600 transition-all"
                aria-label="Twitter"
              >
                <TwitterIcon />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-blue-800 transition-all"
                aria-label="LinkedIn"
              >
                <LinkedInIcon />
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
            <Link href="/terms" className="hover:text-white transition-colors">{t.footer.memberAgreement}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
