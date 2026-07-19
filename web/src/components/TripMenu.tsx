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
import type { Rounding } from "../lib/types"
import { AddMember } from "./AddMember"
import { RenameTrip } from "./RenameTrip"
import { ShareBar } from "./ShareBar"

const ROUNDING_OPTIONS: { label: string; value: Rounding | "exact" }[] = [
  { label: "Exact", value: "exact" },
  { label: "Nearest 1", value: 1 },
  { label: "Nearest 10", value: 10 },
  { label: "Nearest 100", value: 100 },
]

type MenuDialog = "rename" | "share" | "member"

// The trip's overflow menu: a real dropdown of actions, each opening a focused
// dialog, so the trip screen stays add → see → settle. Rounding is a setting,
// not an action, so it lives inline in the menu as a radio group.
export function TripMenu({
  slug,
  title,
  shareUrl,
  rounding,
  onRounding,
  onChanged,
}: {
  slug: string
  title: string
  shareUrl: string
  rounding: Rounding | undefined
  onRounding: (r: Rounding | undefined) => void
  onChanged: () => void
}) {
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
          <Button type="button" variant="ghost" aria-label="Trip menu" className="px-3 text-xl">
            ⋮
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent aria-label="Trip options">
          <DropdownMenuItem onSelect={() => setDialog("rename")}>Rename trip…</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog("share")}>Share…</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog("member")}>Add member…</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Round settle-up</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={String(rounding ?? "exact")}
            onValueChange={(value) =>
              onRounding(value === "exact" ? undefined : (Number(value) as Rounding))
            }
          >
            {ROUNDING_OPTIONS.map((o) => (
              <DropdownMenuRadioItem key={String(o.value)} value={String(o.value)}>
                {o.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog {...dialogProps("rename")}>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle>Rename trip</DialogTitle>
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
          <DialogTitle>Share this trip</DialogTitle>
          <DialogDescription>
            Anyone with the link can open the trip — no account needed.
          </DialogDescription>
          <ShareBar url={shareUrl} />
        </DialogContent>
      </Dialog>

      <Dialog {...dialogProps("member")}>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle>Add member</DialogTitle>
          <AddMember slug={slug} onAdded={onChanged} label="Name" />
        </DialogContent>
      </Dialog>
    </>
  )
}
