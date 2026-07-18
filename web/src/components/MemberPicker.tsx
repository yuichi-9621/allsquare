import { Button } from "@allsquare/ui"
import type { Member } from "../lib/types"

export function MemberPicker({
  members,
  onPick,
}: {
  members: Member[]
  onPick: (memberId: string) => void
}) {
  return (
    <section aria-label="Who are you?">
      <h2>Who are you?</h2>
      <ul className="flex flex-wrap gap-2">
        {members.map((m) => (
          <li key={m.id}>
            <Button type="button" variant="outline" onClick={() => onPick(m.id)}>
              I'm {m.name}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}
