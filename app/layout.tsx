import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aurora Agent — Autonomous Solana Wallet",
  description:
    "An AI agent that autonomously manages your Solana wallet, analyzes your portfolio, and executes transactions with your approval.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Aurora Agent",
  },
  openGraph: {
    title: "Aurora Agent — Autonomous Solana Wallet",
    description: "An AI agent that autonomously manages your Solana wallet, analyzes your portfolio, and executes transactions with your approval.",
    type: "website",
    url: "https://solana-agent-mobile.vercel.app",
    siteName: "Aurora Agent",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Aurora Agent — Autonomous Solana Wallet" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aurora Agent — Autonomous Solana Wallet",
    description: "An AI agent that autonomously manages your Solana wallet, analyzes your portfolio, and executes transactions with your approval.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#7C3AED",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-950 text-gray-100 min-h-screen`}
      >
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{})})}`,
          }}
        />
      </body>
    </html>
  );
}
