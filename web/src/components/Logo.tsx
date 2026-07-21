import { cn } from "@allsquare/ui"

// The Allsquare header lockup: an equals-sign stamp — the "all square" idea,
// the same mark as the app icon — paired with the cornsilk wordmark. The mark
// carries the one accent: petrol teal, one step darker than the paper-foil
// (#2F6F6C) so it separates cleanly from the sage cover. The word stays
// cornsilk (#FEFAE0, matching the icon bars), reading like an embossed
// passport-cover foil stamp rather than flat ink.
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className="flex h-7 w-7 flex-none flex-col items-center justify-center gap-[5px] rounded-lg bg-[#123F3C]"
      >
        <span className="block h-[4px] w-[15px] rounded-full bg-[#FEFAE0]" />
        <span className="block h-[4px] w-[15px] rounded-full bg-[#FEFAE0]" />
      </span>
      <span className="font-mono text-base font-bold uppercase tracking-[0.28em] text-[#FEFAE0]">
        Allsquare
      </span>
    </span>
  )
}
