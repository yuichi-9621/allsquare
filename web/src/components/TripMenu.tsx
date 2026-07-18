import { useEffect, useRef, useState } from "react"
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
// stays add → see → settle. A simple disclosure (click ⋮ or outside to close).
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
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open])

  return (
    <div className="trip-menu" ref={ref}>
      <button
        type="button"
        className="menu-toggle"
        aria-label="Trip menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        ⋮
      </button>
      {open ? (
        <div className="menu-panel" role="menu" aria-label="Trip options">
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
            <label>
              Round settle-up
              <select
                value={rounding ?? "exact"}
                onChange={(e) =>
                  onRounding(
                    e.target.value === "exact" ? undefined : (Number(e.target.value) as Rounding),
                  )
                }
              >
                {ROUNDING_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      ) : null}
    </div>
  )
}
