import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Sparkles } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { signIn, signUp } from "@/app/auth/actions";

export const metadata: Metadata = {
  title: "Account"
};

type LoginPageProps = {
  searchParams: Promise<{
    mode?: string;
    error?: string;
    message?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const isSignup = params.mode === "signup";

  return (
    <main className="grid min-h-screen bg-[#f6f4ee] lg:grid-cols-[.85fr_1.15fr]">
      <aside className="noise relative hidden overflow-hidden bg-[#171817] p-10 text-white lg:flex lg:flex-col">
        <BrandMark inverse />
        <div className="relative my-auto max-w-lg">
          <span className="eyebrow !text-[#d9ff43]">
            Your AI Marketing Director
          </span>
          <h1 className="display mt-6 text-7xl leading-[.9]">
            A month of direction starts here.
          </h1>
          <div className="mt-9 grid gap-4 text-sm text-white/65">
            {[
              "Strategy before content",
              "A complete 30-day execution calendar",
              "Ready-made videos released on schedule"
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle2 size={17} className="text-[#d9ff43]" />
                {item}
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-white/35">
          Campaignova private beta
        </p>
      </aside>

      <section className="flex min-h-screen flex-col">
        <header className="flex h-20 items-center justify-between border-b border-black/10 px-5 sm:px-10">
          <div className="lg:hidden">
            <BrandMark compact />
          </div>
          <Link
            href="/"
            className="hidden items-center gap-2 text-xs font-black text-[#60655f] no-underline lg:flex"
          >
            <ArrowLeft size={15} />
            Back to home
          </Link>
          <span className="text-xs font-bold text-[#777c75]">
            Private beta
          </span>
        </header>

        <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col justify-center px-5 py-12 sm:px-10">
          <span className="eyebrow">
            {isSignup ? "Create your account" : "Welcome back"}
          </span>
          <h2 className="display mt-4 text-5xl leading-[.95] sm:text-6xl">
            {isSignup ? "Build your first campaign." : "Continue your plan."}
          </h2>
          <p className="mt-4 text-sm leading-6 text-[#686d67]">
            {isSignup
              ? "Create Business Memory once, then generate a fresh plan every month."
              : "Sign in to access your strategy, calendar and video releases."}
          </p>

          {(params.error || params.message) && (
            <div
              className={`mt-6 rounded-2xl border p-4 text-sm ${
                params.error
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-[#cce92f] bg-[#f4ffd0] text-[#394700]"
              }`}
            >
              {params.error ?? params.message}
            </div>
          )}

          <form action={isSignup ? signUp : signIn} className="mt-8 grid gap-5">
            {isSignup && (
              <label className="field-label">
                Full name
                <input
                  name="fullName"
                  className="field"
                  autoComplete="name"
                  required
                />
              </label>
            )}
            <label className="field-label">
              Email
              <input
                name="email"
                type="email"
                className="field"
                autoComplete="email"
                required
              />
            </label>
            <label className="field-label">
              Password
              <input
                name="password"
                type="password"
                className="field"
                minLength={10}
                autoComplete={isSignup ? "new-password" : "current-password"}
                required
              />
            </label>
            {isSignup && (
              <label className="field-label">
                Timezone
                <select
                  name="timezone"
                  className="field"
                  defaultValue="Europe/Belgrade"
                >
                  <option>Europe/Belgrade</option>
                  <option>Europe/London</option>
                  <option>America/New_York</option>
                  <option>America/Chicago</option>
                  <option>America/Los_Angeles</option>
                </select>
              </label>
            )}
            <button type="submit" className="button-primary mt-2">
              {isSignup ? "Create account" : "Sign in"}
              <Sparkles size={17} />
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-[#686d67]">
            {isSignup ? "Already have an account?" : "New to Campaignova?"}{" "}
            <Link
              href={isSignup ? "/login" : "/login?mode=signup"}
              className="font-black text-[#695cff]"
            >
              {isSignup ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
