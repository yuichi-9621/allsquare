import { Button } from "@allsquare/ui"
import { useT } from "../lib/i18n"
import type { Member } from "../lib/types"
import { MemberAvatar } from "./MemberAvatar"

export function MemberPicker({
  members,
  onPick,
}: {
  members: Member[]
  onPick: (memberId: string) => void
}) {
  const t = useT()
  return (
    <section aria-label={t("whoAreYou")} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{t("whoAreYou")}</h2>
        <p className="text-sm text-muted-foreground">{t("tapYourName")}</p>
      </div>
      <ul className="flex flex-col gap-2">
        {members.map((m) => (
          <li key={m.id}>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full justify-start gap-2.5 text-base font-semibold"
              onClick={() => onPick(m.id)}
            >
              <MemberAvatar members={members} memberId={m.id} />
              {t("imMember", { name: m.name })}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}
