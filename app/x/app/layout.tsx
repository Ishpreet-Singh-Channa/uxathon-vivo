import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Context Persona Flow — Multiplayer UX Race',
  description: 'Real-time multiplayer card-swipe game: build the correct 5-step persona flow before your rivals.',
  keywords: ['UX game', 'persona', 'multiplayer', 'card game', 'uxism'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
