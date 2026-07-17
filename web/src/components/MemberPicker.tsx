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
      <ul>
        {members.map((m) => (
          <li key={m.id}>
            <button type="button" onClick={() => onPick(m.id)}>
              I'm {m.name}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
