import { cn } from "../lib/utils"

export function Stamp({
  state,
  className,
  labels,
}: {
  state: "pending" | "square"
  className?: string
  labels?: { square?: string; pending?: string }
}) {
  const base =
    "inline-block -rotate-[10deg] rounded-md border-2 px-1.5 py-0.5 font-mono text-[0.55rem] uppercase tracking-widest"
  if (state === "square") {
    return (
      <span className={cn(base, "animate-stamp-in border-secondary text-secondary", className)}>
        {labels?.square ?? "All square"}
      </span>
    )
  }
  return (
    <span
      className={cn(
        base,
        "border-dashed border-muted-foreground/60 text-muted-foreground",
        className,
      )}
    >
      {labels?.pending ?? "Not yet square"}
    </span>
  )
}
