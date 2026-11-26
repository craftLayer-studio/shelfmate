import type {Metadata, Viewport} from 'next';
import './globals.css';
import {Providers} from './providers';

export const metadata: Metadata = {
  metadataBase: new URL('https://shelfmate.craftlayer.store'),
  title: {default: 'ShelfMate: QR orders, khata and GST bills for kirana stores', template: '%s | ShelfMate'},
  description:
    'A QR at the counter opens your store catalog for home delivery or pickup. Khata with WhatsApp reminders, GST bills, stock and expiry alerts. Built for kirana, general stores and small pharmacies.',
};

export const viewport: Viewport = {width: 'device-width', initialScale: 1};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en-IN">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
