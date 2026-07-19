import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@allsquare/ui"
import { useState } from "react"
import { type Locale, type MessageKey, t, useLocale } from "../lib/i18n"
import type { Member, Rounding } from "../lib/types"
import { AddMember } from "./AddMember"
import { PaymentInfo } from "./PaymentInfo"
import { RenameTrip } from "./RenameTrip"
import { ShareBar } from "./ShareBar"

const ROUNDING_OPTIONS: { labelKey: MessageKey; value: Rounding | "exact" }[] = [
  { labelKey: "roundingExact", value: "exact" },
  { labelKey: "roundingNearest1", value: 1 },
  { labelKey: "roundingNearest10", value: 10 },
  { labelKey: "roundingNearest100", value: 100 },
]

type MenuDialog = "rename" | "share" | "member" | "payment"

// The trip's overflow menu: a real dropdown of actions, each opening a focused
// dialog, so the trip screen stays add → see → settle. Rounding is a setting,
// not an action, so it lives inline in the menu as a radio group.
export function TripMenu({
  slug,
  title,
  shareUrl,
  rounding,
  activeMember,
  onRounding,
  onChanged,
}: {
  slug: string
  title: string
  shareUrl: string
  rounding: Rounding | undefined
  activeMember?: Member | null | undefined
  onRounding: (r: Rounding | undefined) => void
  onChanged: () => void
}) {
  const [locale, setLocale] = useLocale()
  const [dialog, setDialog] = useState<MenuDialog | null>(null)
  const close = () => setDialog(null)
  const dialogProps = (name: MenuDialog) => ({
    open: dialog === name,
    onOpenChange: (open: boolean) => {
      if (!open) close()
    },
  })

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" aria-label={t("tripMenu")} className="px-3 text-xl">
            ⋮
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent aria-label={t("tripOptions")}>
          <DropdownMenuItem onSelect={() => setDialog("rename")}>
            {t("renameTripMenuItem")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog("share")}>
            {t("shareMenuItem")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog("member")}>
            {t("addMemberMenuItem")}
          </DropdownMenuItem>
          {activeMember ? (
            <DropdownMenuItem onSelect={() => setDialog("payment")}>
              {t("yourPaymentInfoMenuItem")}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>{t("roundSettleUp")}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={String(rounding ?? "exact")}
            onValueChange={(value) =>
              onRounding(value === "exact" ? undefined : (Number(value) as Rounding))
            }
          >
            {ROUNDING_OPTIONS.map((o) => (
              <DropdownMenuRadioItem key={String(o.value)} value={String(o.value)}>
                {t(o.labelKey)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>{t("language")}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={locale}
            onValueChange={(value) => setLocale(value as Locale)}
          >
            <DropdownMenuRadioItem value="en">EN</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="ja">日本語</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog {...dialogProps("rename")}>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle>{t("renameTripTitle")}</DialogTitle>
          <RenameTrip
            slug={slug}
            title={title}
            onRenamed={() => {
              onChanged()
              close()
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog {...dialogProps("share")}>
        <DialogContent>
          <DialogTitle>{t("shareTripTitle")}</DialogTitle>
          <DialogDescription>{t("shareTripDesc")}</DialogDescription>
          <ShareBar url={shareUrl} />
        </DialogContent>
      </Dialog>

      <Dialog {...dialogProps("member")}>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle>{t("addMemberFormTitle")}</DialogTitle>
          <AddMember slug={slug} onAdded={onChanged} label={t("memberName")} />
        </DialogContent>
      </Dialog>

      {activeMember ? (
        <Dialog {...dialogProps("payment")}>
          <DialogContent aria-describedby={undefined}>
            <DialogTitle>{t("yourPaymentInfoTitle")}</DialogTitle>
            <PaymentInfo
              slug={slug}
              member={activeMember}
              onSaved={() => {
                onChanged()
                close()
              }}
            />
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  )
}
