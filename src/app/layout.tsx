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
  metadataBase: new URL("https://keytap.vercel.app"),
  title: {
    default: "KeyTap — Free Online Typing Speed Test",
    template: "%s | KeyTap",
  },
  description:
    "Test and improve your typing speed with KeyTap. Beautiful mechanical keyboard visualization, real-time WPM tracking, multiple languages, dark mode, and multiplayer duel mode. Free, no account required.",
  keywords: [
    "typing test",
    "typing speed test",
    "WPM test",
    "words per minute",
    "typing practice",
    "keyboard test",
    "typing game",
    "typing speed",
    "online typing test",
    "free typing test",
    "mechanical keyboard",
    "duel typing",
    "multiplayer typing",
  ],
  authors: [{ name: "XiTawS", url: "https://x.com/_XiTawS" }],
  creator: "XiTawS",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⌨️</text></svg>",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://keytap.vercel.app",
    siteName: "KeyTap",
    title: "KeyTap — Free Online Typing Speed Test",
    description:
      "Test your typing speed with a beautiful mechanical keyboard. Track WPM, accuracy, and compete in multiplayer duels.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "KeyTap — Typing Speed Test",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "KeyTap — Free Online Typing Speed Test",
    description:
      "Test your typing speed with a beautiful mechanical keyboard. Track WPM, accuracy, and compete in multiplayer duels.",
    images: ["/og-image.png"],
    creator: "@_XiTawS",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://keytap.vercel.app",
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
      className={`${geistSans.variable} ${geistMono.variable} dark h-dvh overflow-hidden antialiased`}
      suppressHydrationWarning
    >
      <body className="h-dvh overflow-hidden flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-[var(--theme-accent)]/20 transition-colors duration-200">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "KeyTap",
              url: "https://keytap.vercel.app",
              description:
                "Free online typing speed test with mechanical keyboard visualization, real-time WPM tracking, and multiplayer modes.",
              applicationCategory: "UtilityApplication",
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              author: {
                "@type": "Person",
                name: "XiTawS",
                url: "https://x.com/_XiTawS",
              },
            }),
          }}
        />
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
