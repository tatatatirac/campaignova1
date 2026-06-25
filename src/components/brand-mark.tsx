import Link from "next/link";

export function BrandMark({
  compact = false,
  inverse = false
}: {
  compact?: boolean;
  inverse?: boolean;
}) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-3 no-underline ${
        inverse ? "text-white" : "text-[#121412]"
      }`}
    >
      <span
        className="relative grid size-9 place-items-center overflow-hidden rounded-[12px] bg-[#121412]"
        aria-hidden="true"
      >
        <span className="absolute left-[9px] top-[17px] h-[3px] w-[17px] -rotate-45 rounded-full bg-[#d9ff43]" />
        <span className="absolute right-[8px] top-[9px] size-[6px] rounded-full bg-[#695cff]" />
      </span>
      {!compact && (
        <span className="grid leading-none">
          <span className="text-[16px] font-black tracking-[-0.045em]">
            Campaignova
          </span>
          <span
            className={`mt-1 text-[8px] font-black tracking-[0.16em] uppercase ${
              inverse ? "text-white/45" : "text-[#6d726b]"
            }`}
          >
            AI Marketing Director
          </span>
        </span>
      )}
    </Link>
  );
}
