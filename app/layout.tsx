// Path: app/layout.tsx
// Title: Root Layout Component
// Purpose: Defines the global layout, including HTML structure, fonts, scripts, and basic providers.
import { ClerkProvider } from "@clerk/nextjs";
import { jaJP } from "@clerk/localizations";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";
import "katex/dist/katex.min.css";
import { getStoredPublicAdSenseSettings } from "@/lib/adsense-server";
import { getServerLocale } from "@/lib/locale-server";
import { getRootMetadata } from "@/lib/metadata";
import ServiceWorkerRegistrar from "./components/ServiceWorkerRegistrar";
import MultisessionAppSupport from "./components/MultisessionAppSupport";

const geistSans = localFont({
  variable: "--font-geist-sans",
  src: [
    {
      path: "../node_modules/next/dist/next-devtools/server/font/geist-latin.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "../node_modules/next/dist/next-devtools/server/font/geist-latin-ext.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  display: "swap",
});

const geistMono = localFont({
  variable: "--font-geist-mono",
  src: [
    {
      path: "../node_modules/next/dist/next-devtools/server/font/geist-mono-latin.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "../node_modules/next/dist/next-devtools/server/font/geist-mono-latin-ext.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return getRootMetadata(locale);
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();
  const gtmContainerId = "GTM-PM7XG62T";
  const clerkPubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const multiSessionEnabled =
    process.env.NEXT_PUBLIC_CLERK_MULTI_SESSION_ENABLED === "true";
  const adSenseSettings = await getStoredPublicAdSenseSettings();
  const adSenseScript = adSenseSettings.enabled && adSenseSettings.clientId ? (
    <script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adSenseSettings.clientId}`}
      crossOrigin="anonymous"
    />
  ) : null;
  const tagManagerScripts = (
    <>
      <Script
        id="google-tag-manager"
        strategy="beforeInteractive"
      >
        {`
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({
            'gtm.start': new Date().getTime(),
            event: 'gtm.js'
          });
          window.gtag = function(){window.dataLayer.push(arguments);};
          window.gtag('consent', 'default', {
            ad_storage: 'granted',
            analytics_storage: 'granted',
            ad_user_data: 'granted',
            ad_personalization: 'granted'
          });
        `}
      </Script>
      <Script
        id="google-tag-manager-src"
        strategy="beforeInteractive"
        src={`https://www.googletagmanager.com/gtm.js?id=${gtmContainerId}`}
      />
    </>
  );

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {tagManagerScripts}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${gtmContainerId}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {adSenseScript}
        <ServiceWorkerRegistrar />
        {clerkPubKey ? (
          <ClerkProvider
            publishableKey={clerkPubKey}
            localization={jaJP}
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            signInFallbackRedirectUrl="/"
            signUpFallbackRedirectUrl="/onboarding"
            afterSignOutUrl="/"
          >
            {clerkPubKey && multiSessionEnabled ? (
              <MultisessionAppSupport>{children}</MultisessionAppSupport>
            ) : (
              children
            )}
          </ClerkProvider>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
