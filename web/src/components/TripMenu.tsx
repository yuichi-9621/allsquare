import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@allsquare/ui"
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

// The trip's overflow menu: everything secondary lives here so the trip screen
// stays add → see → settle. A Popover disclosure — Radix manages open/close,
// outside-click dismissal, and aria-expanded/aria-haspopup on the trigger.
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
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" className="menu-toggle" aria-label="Trip menu">
          ⋮
        </Button>
      </PopoverTrigger>
      <PopoverContent aria-label="Trip options">
        <div className="menu-item">
          <h3>Rename trip</h3>
          <RenameTrip slug={slug} title={title} onRenamed={onChanged} />
        </div>
        <div className="menu-item">
          <h3>Share</h3>
          <ShareBar url={shareUrl} />
        </div>
        <div className="menu-item">
          <h3>Add member</h3>
          <AddMember slug={slug} onAdded={onChanged} />
        </div>
        <div className="menu-item">
          <label htmlFor="rounding-trigger">
            Round settle-up
            <Select
              value={String(rounding ?? "exact")}
              onValueChange={(value) =>
                onRounding(value === "exact" ? undefined : (Number(value) as Rounding))
              }
            >
              <SelectTrigger id="rounding-trigger" aria-label="Round settle-up">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROUNDING_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={String(o.value)}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>
      </PopoverContent>
    </Popover>
  )
}
