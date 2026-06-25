import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms for using Campaignova."
};

const sections = [
  {
    title: "Use of the service",
    body: [
      "Campaignova helps users create marketing strategy, content, sales material, PDF exports, PowerPoint exports and ready-video release plans.",
      "You are responsible for the information you enter, the outputs you choose to use, and the marketing decisions you publish or send.",
      "You must use the service only for lawful business purposes and in a way that does not harm Campaignova, other users or third parties."
    ]
  },
  {
    title: "Accounts and access",
    body: [
      "You are responsible for keeping account access secure.",
      "You must provide accurate account information and may not impersonate another person or business.",
      "Campaignova may restrict, suspend or terminate access for abuse, security risk, unlawful use, excessive automated usage or violation of these terms."
    ]
  },
  {
    title: "Generated content",
    body: [
      "AI-generated output can be inaccurate, incomplete or unsuitable for a specific market or claim.",
      "You must review all generated content before publishing, sending, relying on or presenting it.",
      "Campaignova does not guarantee that a strategy, post, email, landing page, sales pitch, video release or export will produce leads, sales, revenue, rankings or any specific business result."
    ]
  },
  {
    title: "Business and marketing compliance",
    body: [
      "You are responsible for complying with advertising, consumer protection, email, privacy, intellectual property and platform rules that apply to your business.",
      "Do not use Campaignova to create deceptive claims, unlawful offers, spam, harassment, hate, malware, illegal content or content that violates third-party rights.",
      "Do not enter confidential secrets, passwords, payment card data, government identifiers or sensitive regulated data into the service."
    ]
  },
  {
    title: "Plans, billing and beta access",
    body: [
      "Campaignova is currently prepared for private beta and early production use.",
      "Paid billing will be activated after the business and payment provider setup is complete.",
      "Plan limits, features, pricing and video entitlements may change before public launch."
    ]
  },
  {
    title: "Availability and changes",
    body: [
      "Campaignova may change, pause, remove or update features as the product improves.",
      "The service may be unavailable because of maintenance, provider outages, security work, network issues or other operational reasons.",
      "Campaignova is provided without a guarantee of uninterrupted availability or error-free output."
    ]
  },
  {
    title: "Limitation of liability",
    body: [
      "To the maximum extent allowed by law, Campaignova is not liable for indirect, incidental, special, consequential, exemplary or lost-profit damages.",
      "Campaignova's total liability for any claim related to the service is limited to the amount paid for the service during the three months before the claim, or 100 USD if no amount was paid."
    ]
  }
];

export default function TermsPage() {
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
        <p className="eyebrow">Campaignova terms</p>
        <h1 className="display mt-5 max-w-4xl text-5xl leading-[.95] sm:text-7xl">
          Terms of Service
        </h1>
        <p className="mt-6 max-w-2xl text-sm leading-7 text-[#626760]">
          Last updated: June 26, 2026. These terms apply to use of Campaignova,
          including the private beta and first production release.
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
            Questions about these terms can be sent to{" "}
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

