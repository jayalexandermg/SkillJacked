import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Syne, DM_Sans, JetBrains_Mono } from 'next/font/google';
import '@/styles/globals.css';

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://skilljacked.com'),
  title: 'SkillJacked — Turn YouTube videos into AI skills',
  description: 'Stop watching. Start doing. Turn any YouTube video into a Claude Code skill in 10 seconds.',
  keywords: [
    'SkillJack',
    'YouTube',
    'AI skills',
    'Claude Code',
    'developer tools',
    'code automation',
    'skill extraction',
  ],
  authors: [{ name: 'SkillJack' }],
  creator: 'SkillJack',
  openGraph: {
    type: 'website',
    siteName: 'SkillJack',
    title: 'SkillJacked — Turn YouTube videos into AI skills',
    description: 'Stop watching. Start doing. Turn any YouTube video into a Claude Code skill in 10 seconds.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'SkillJacked — Turn YouTube videos into AI skills',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SkillJacked — Turn YouTube videos into AI skills',
    description: 'Stop watching. Start doing. Turn any YouTube video into a Claude Code skill in 10 seconds.',
  },
  icons: {
    icon: '/favicon.svg',
  },
  other: {
    'theme-color': '#0a0a0f',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#e0c866',
          colorBackground: '#141419',
          colorInputBackground: '#0a0a0f',
          colorInputText: '#f8fafc',
          colorText: '#f8fafc',
          colorTextSecondary: '#8a8a9a',
          borderRadius: '0.5rem',
        },
      }}
    >
      <html lang="en" className={`${syne.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}>
        <body className="bg-primary text-text-primary font-body min-h-screen">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
