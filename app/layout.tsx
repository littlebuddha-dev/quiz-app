import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import "katex/dist/katex.min.css";
import { getSiteUrl } from "@/lib/site-config";
import { getStoredPublicAdSenseSettings } from "@/lib/adsense-server";
import ServiceWorkerRegistrar from "./components/ServiceWorkerRegistrar";

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
  metadataBase: new URL(getSiteUrl()),
  manifest: '/manifest.webmanifest',
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
    url: getSiteUrl(),
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaMeasurementId = "G-EQKMQ4QJ7G";
  const clerkPubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const adSenseSettings = await getStoredPublicAdSenseSettings();
  const adSenseScript = adSenseSettings.enabled && adSenseSettings.clientId ? (
    <Script
      id="adsense-script"
      async
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adSenseSettings.clientId}`}
      crossOrigin="anonymous"
    />
  ) : null;
  const analyticsScripts = (
    <>
      <Script
        id="google-analytics-script"
        async
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
      />
      <Script id="google-analytics-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('consent', 'default', {
            ad_storage: 'granted',
            analytics_storage: 'granted',
            ad_user_data: 'granted',
            ad_personalization: 'granted'
          });
          gtag('config', '${gaMeasurementId}');
        `}
      </Script>
    </>
  );

  if (!clerkPubKey) {
    if (process.env.NODE_ENV === "production" && !process.env.NEXT_PHASE) {
      console.warn("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not set.");
    }
    return (
      <html lang="ja" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {analyticsScripts}
          {adSenseScript}
          <ServiceWorkerRegistrar />
          {children}
        </body>
      </html>
    );
  }

  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <html lang="ja" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {analyticsScripts}
          {adSenseScript}
          <ServiceWorkerRegistrar />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
