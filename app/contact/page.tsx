import type { Metadata } from 'next';
import ContactContent from './ContactContent';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Cueへのお問い合わせ',
};

export default function ContactPage() {
  return <ContactContent />;
}
