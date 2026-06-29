import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://campaignova.com";
const ogImage = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Campaignova AI Marketing Director dashboard preview"
};

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Campaignova - Your AI Marketing Director",
    template: "%s | Campaignova"
  },
  description:
    "Strategy, content and ready-to-publish campaigns built around your business.",
  openGraph: {
    title: "Campaignova - Your AI Marketing Director",
    description:
      "Strategy, content and ready-to-publish campaigns built around your business.",
    url: appUrl,
    siteName: "Campaignova",
    type: "website",
    images: [ogImage]
  },
  twitter: {
    card: "summary_large_image",
    title: "Campaignova - Your AI Marketing Director",
    description:
      "Strategy, content and ready-to-publish campaigns built around your business.",
    images: [ogImage.url]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
