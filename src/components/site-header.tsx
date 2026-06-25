import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export function SiteHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="shell flex h-[82px] items-center justify-between">
        <BrandMark />
        <nav className="hidden items-center gap-7 text-[13px] font-bold md:flex">
          <a href="#how-it-works" className="text-[#4f554e] no-underline">
            How it works
          </a>
          <a href="#deliverables" className="text-[#4f554e] no-underline">
            Deliverables
          </a>
          <a href="#pricing" className="text-[#4f554e] no-underline">
            Pricing
          </a>
        </nav>
        <Link
          href="/login?mode=signup"
          className="button-primary !min-h-10 !px-4"
        >
          Build my plan
          <ArrowUpRight size={16} />
        </Link>
      </div>
    </header>
  );
}
