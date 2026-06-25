import type { Metadata } from "next";
import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://campaignova.com";

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
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Campaignova - Your AI Marketing Director",
    description:
      "Strategy, content and ready-to-publish campaigns built around your business."
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
