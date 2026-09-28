import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Providers } from '@/components/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Arena Saquarema',
  description: 'Bar, comandas e day use da Arena Saquarema',
  icons: { icon: '/favicon.svg' },
};

export const viewport: Viewport = { themeColor: '#0b3a82' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
