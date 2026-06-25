import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Campaignova handles account, business and usage data."
};

const sections = [
  {
    title: "Information we collect",
    body: [
      "Account information such as name, email address and timezone.",
      "Business Memory information such as company name, industry, offer, audience, location, tone, goals, website, competitors and active channels.",
      "Generated campaign content, export requests, video release activity and product usage events.",
      "Technical data such as request metadata used for security, abuse prevention, rate limiting and service reliability."
    ]
  },
  {
    title: "How we use information",
    body: [
      "To generate marketing strategies, content calendars, posts, emails, landing page copy, sales pitch material, PDF exports and PowerPoint exports.",
      "To operate authentication, plan limits, admin monitoring, audit logs, security controls and customer support.",
      "To improve product quality, reliability and user experience.",
      "To protect Campaignova from abuse, fraud, spam, unauthorized access and excessive automated usage."
    ]
  },
  {
    title: "AI processing",
    body: [
      "Campaignova sends the minimum useful business context and campaign context to AI providers to generate requested marketing outputs.",
      "Do not enter sensitive personal data, protected health information, financial account numbers, passwords or secrets into Business Memory or campaign fields.",
      "Generated output should be reviewed before publishing or sending to customers."
    ]
  },
  {
    title: "Data sharing",
    body: [
      "We do not sell user data.",
      "We use service providers needed to operate the product, including hosting, database, authentication, storage, AI generation, analytics, monitoring and future payment processing.",
      "We may disclose information if required to comply with law, enforce our terms, protect rights and safety, or respond to valid legal process."
    ]
  },
  {
    title: "Security and retention",
    body: [
      "We use authentication, Row Level Security, server-side validation, rate limiting, audit logs and server-only secrets to protect the service.",
      "No internet service is perfectly secure. Users are responsible for keeping login credentials safe.",
      "We retain account, business and campaign data while the account is active or as needed for service, security, legal and operational purposes."
    ]
  },
  {
    title: "Your choices",
    body: [
      "You can update business information in the product.",
      "You can request account or data deletion by contacting Campaignova support.",
      "You can choose not to enter information that you do not want processed by the product."
    ]
  }
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#f7f4ec]">
      <header className="border-b border-black/10 bg-[#faf8f3]">
        <div className="shell flex h-20 items-center justify-between">
          <BrandMark />
          <Link href="/" className="button-secondary !min-h-10 !px-4">
            Back home
          </Link>
        </div>
      </header>
      <section className="shell py-16 sm:py-24">
        <p className="eyebrow">Campaignova policy</p>
        <h1 className="display mt-5 max-w-4xl text-5xl leading-[.95] sm:text-7xl">
          Privacy Policy
        </h1>
        <p className="mt-6 max-w-2xl text-sm leading-7 text-[#626760]">
          Last updated: June 26, 2026. This page explains how Campaignova
          handles account, business and campaign data for the private beta and
          first production release.
        </p>
        <div className="mt-12 grid gap-4">
          {sections.map((section) => (
            <article key={section.title} className="card p-6 sm:p-8">
              <h2 className="text-2xl font-black">{section.title}</h2>
              <ul className="mt-5 grid gap-3 text-sm leading-6 text-[#555a54]">
                {section.body.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#695cff]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <article className="card mt-4 p-6 sm:p-8">
          <h2 className="text-2xl font-black">Contact</h2>
          <p className="mt-4 text-sm leading-6 text-[#555a54]">
            For privacy requests, contact{" "}
            <a className="font-black text-[#695cff]" href="mailto:hello@campaignova.com">
              hello@campaignova.com
            </a>
            .
          </p>
        </article>
      </section>
    </main>
  );
}

