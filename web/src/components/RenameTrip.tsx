import { Button, Input, Label } from "@allsquare/ui"
import { type FormEvent, useId, useState } from "react"
import { renameGroup } from "../lib/api"

export function RenameTrip({
  slug,
  title,
  onRenamed,
}: {
  slug: string
  title: string
  onRenamed: () => void
}) {
  const inputId = useId()
  const [name, setName] = useState(title)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const next = name.trim()
    if (next === "") {
      setError("Enter a trip name.")
      return
    }
    setError(null)
    setSaving(true)
    try {
      await renameGroup(slug, next)
      onRenamed()
    } catch {
      setError("Could not rename the trip.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} aria-label="Rename trip" className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <Label htmlFor={inputId}>Trip name</Label>
        <Input id={inputId} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={saving}>
        Save name
      </Button>
    </form>
  )
}
