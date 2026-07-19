import { cn } from "@allsquare/ui"
import type { Member } from "../lib/types"

// Six inks that read on both surfaces; assignment is by the member's stable
// position in the server-ordered list, so colors match on every device.
const INKS = [
  "bg-secondary text-secondary-foreground",
  "bg-primary text-primary-foreground",
  "bg-foil text-background",
  "bg-success text-primary-foreground",
  "bg-muted-foreground text-background",
  "bg-foreground text-background",
]

export function memberInk(members: Member[], memberId: string): string {
  const i = members.findIndex((m) => m.id === memberId)
  return INKS[(i < 0 ? 0 : i) % INKS.length] ?? INKS[0] ?? ""
}

// A small initial chip; decorative (the name is always printed beside it).
// The initial is CSS generated content so it stays out of textContent and
// the accessibility tree; "Bob → Alice" reads and queries as plain text.
export function MemberAvatar({
  members,
  memberId,
  className,
}: {
  members: Member[]
  memberId: string
  className?: string
}) {
  const name = members.find((m) => m.id === memberId)?.name ?? "?"
  return (
    <span
      aria-hidden
      data-initial={name.charAt(0).toUpperCase()}
      className={cn(
        "flex h-5 w-5 shrink-0 select-none items-center justify-center rounded-full font-mono text-[0.6rem] font-bold leading-none after:content-[attr(data-initial)]",
        memberInk(members, memberId),
        className,
      )}
    />
  )
}
