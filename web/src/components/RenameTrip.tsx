import { type FormEvent, useState } from "react"
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
    <form onSubmit={onSubmit} aria-label="Rename trip">
      <label>
        Trip name
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      {error ? <p role="alert">{error}</p> : null}
      <button type="submit" disabled={saving}>
        Save name
      </button>
    </form>
  )
}
