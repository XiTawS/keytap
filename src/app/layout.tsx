import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from "@/contexts/settings-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KeyTest — Typing Speed Test",
  description:
    "Test your typing speed with a beautiful mechanical keyboard visualization",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⌨️</text></svg>",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-screen overflow-hidden antialiased`}
      suppressHydrationWarning
    >
      <body className="h-screen overflow-hidden flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-[var(--theme-accent)]/20 transition-colors duration-200">
        <SettingsProvider>
          {children}
          <a
            href="https://x.com/_XiTawS"
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-3 right-4 text-xs text-zinc-500 hover:text-zinc-300 transition-colors z-50 font-mono"
          >
            Made by @XiTawS
          </a>
        </SettingsProvider>
      </body>
    </html>
  );
}
