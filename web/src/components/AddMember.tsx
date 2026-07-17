import { type FormEvent, useState } from "react"
import { addMember } from "../lib/api"
import type { Member } from "../lib/types"

// Adds a member to an existing group. Calls the API itself (same pattern as
// ExpenseForm) and hands the created member back so the caller can react —
// e.g. a new joiner adding their own name is then identified as that member.
export function AddMember({
  slug,
  onAdded,
  label = "Add member",
  submitLabel = "Add member",
}: {
  slug: string
  onAdded: (member: Member) => void
  label?: string
  submitLabel?: string
}) {
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (trimmed === "") {
      setError("Enter a name.")
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const member = await addMember(slug, trimmed)
      setName("")
      onAdded(member)
    } catch {
      setError("Could not add the member.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} aria-label="Add member" className="add-member">
      <label>
        {label}
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
      </label>
      {error ? <p role="alert">{error}</p> : null}
      <button type="submit" disabled={submitting}>
        {submitLabel}
      </button>
    </form>
  )
}
