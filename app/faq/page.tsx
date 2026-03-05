import type { Metadata } from 'next';
import { FaqPageClient } from '@/components/faq/faq-page-client';

export const metadata: Metadata = {
  title: 'FAQ | ABG Alumni Connect',
  description: 'Frequently asked questions about ABG Alumni Connect - platform basics, features, privacy, and premium membership.',
};

export default function FaqPage() {
  return <FaqPageClient />;
}
