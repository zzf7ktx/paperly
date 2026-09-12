import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Paperly — Edit PDF text in your browser',
  description: 'Edit text in existing PDF documents privately in your browser and export a polished new PDF.',
  icons: { icon: '/favicon.svg' },
  metadataBase: new URL('https://paperly-pdf-editor.fairy-guppy-4467.chatgpt.site'),
  openGraph: {
    title: 'Paperly — Edit PDF text in your browser',
    description: 'Edit existing PDF text privately, right in your browser.',
    images: [{ url: '/og.png', width: 1680, height: 945, alt: 'Paperly PDF editor' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Paperly — Edit PDF text in your browser',
    description: 'Edit existing PDF text privately, right in your browser.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
