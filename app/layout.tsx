import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MoriWins — Play & Win',
  description: 'Premium dark-theme gaming platform with Mines and Memory games.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-black text-white min-h-screen">{children}</body>
    </html>
  );
}
