import type { Metadata } from 'next';
import ContactPageClient from './ContactPageClient';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Cueへのお問い合わせ',
};

export default function ContactPage() {
  return <ContactPageClient />;
}
