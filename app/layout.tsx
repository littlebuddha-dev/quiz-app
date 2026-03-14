import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "Cue | すべての人に学ぶことの楽しさを",
    template: "%s | Cue"
  },
  description: "Cueは「すべての人に学ぶことの楽しさを伝えたい」という想いから生まれた、直感的なクイズプラットフォームです。論理的パズルや多言語クイズを通じて、知的好奇心を刺激する新しい学習体験を提供します。",
  keywords: ["クイズ", "学習", "論理的思考", "知育", "学びの楽しさ", "多言語学習", "パズル", "Cue"],
  authors: [{ name: "Cue Team" }],
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: "https://cue-quiz.vercel.app", // 仮のURL
    siteName: "Cue",
    title: "Cue | すべての人に学ぶことの楽しさを",
    description: "直感的なクイズで知的好奇心を刺激。学ぶことの楽しさを、すべての人へ。",
    images: [
      {
        url: "/og-image.png", // 仮のパス
        width: 1200,
        height: 630,
        alt: "Cue - Learn with Fun",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cue | すべての人に学ぶことの楽しさを",
    description: "直感的なクイズで知的好奇みを刺激。学ぶことの楽しさを、すべての人へ。",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clerkPubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <html lang="ja" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
