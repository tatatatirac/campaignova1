import { Check } from "lucide-react";
import Link from "next/link";

const plans = [
  {
    name: "Starter",
    price: "29",
    description: "For one owner-led business that needs a clear monthly system.",
    videos: "1 ready-made video",
    features: [
      "1 brand and monthly plan",
      "30 posts + 10 video scripts",
      "5-email campaign",
      "Landing page copy",
      "5 focused regenerations"
    ]
  },
  {
    name: "Growth",
    price: "79",
    description: "For businesses ready to execute consistently and learn faster.",
    videos: "5 ready-made videos",
    featured: true,
    features: [
      "Everything in Starter",
      "2 monthly plans",
      "Business Memory",
      "Branded PDF export",
      "KPI plan + 20 regenerations"
    ]
  },
  {
    name: "Director",
    price: "149",
    description: "For multi-brand operators who need a full content engine.",
    videos: "30 ready-made videos",
    features: [
      "Up to 3 brands",
      "5 monthly plans",
      "Competitor analysis",
      "Advanced campaign variants",
      "Priority processing"
    ]
  }
];

export function Pricing() {
  return (
    <section id="pricing" className="border-t border-black/10 py-24 sm:py-32">
      <div className="shell">
        <div className="mb-12 max-w-2xl">
          <span className="eyebrow">Simple monthly plans</span>
          <h2 className="display mt-5 text-5xl leading-[0.96] sm:text-7xl">
            Less than one weak ad.
            <br />
            More than a month of direction.
          </h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`card relative flex flex-col p-6 sm:p-8 ${
                plan.featured
                  ? "!border-[#695cff] !bg-[#171717] text-white lg:-translate-y-3"
                  : ""
              }`}
            >
              {plan.featured && (
                <span className="absolute right-5 top-5 rounded-full bg-[#d9ff43] px-3 py-1 text-[10px] font-black tracking-[0.15em] text-[#121412] uppercase">
                  Most popular
                </span>
              )}
              <h3 className="text-xl font-black">{plan.name}</h3>
              <div className="mt-6 flex items-end gap-1">
                <span className="display text-6xl">${plan.price}</span>
                <span
                  className={`pb-2 text-sm ${
                    plan.featured ? "text-white/55" : "text-[#6b716a]"
                  }`}
                >
                  /month
                </span>
              </div>
              <p
                className={`mt-5 min-h-12 text-sm leading-6 ${
                  plan.featured ? "text-white/65" : "text-[#666b64]"
                }`}
              >
                {plan.description}
              </p>
              <div
                className={`my-6 rounded-2xl p-4 text-sm font-black ${
                  plan.featured
                    ? "bg-[#695cff] text-white"
                    : "bg-[#ece9df] text-[#121412]"
                }`}
              >
                {plan.videos}
              </div>
              <ul className="mb-8 grid gap-3">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className={`flex gap-3 text-sm ${
                      plan.featured ? "text-white/80" : "text-[#4d524c]"
                    }`}
                  >
                    <Check size={16} className="mt-0.5 shrink-0 text-[#695cff]" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/login?mode=signup"
                className={`mt-auto ${
                  plan.featured
                    ? "button-primary !border-[#d9ff43] !bg-[#d9ff43] !text-[#121412]"
                    : "button-secondary"
                }`}
              >
                Start with {plan.name}
              </Link>
            </article>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-[#737872]">
          Private beta opens first. Billing activates after the US company and
          Stripe account are ready.
        </p>
      </div>
    </section>
  );
}
