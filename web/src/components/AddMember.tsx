import { Button, Input, Label } from "@allsquare/ui"
import { type FormEvent, useId, useState } from "react"
import { addMember } from "../lib/api"
import { useT } from "../lib/i18n"
import type { Member } from "../lib/types"

// Adds a member to an existing group. Calls the API itself (same pattern as
// ExpenseForm) and hands the created member back so the caller can react —
// e.g. a new joiner adding their own name is then identified as that member.
export function AddMember({
  slug,
  onAdded,
  label,
  submitLabel,
}: {
  slug: string
  onAdded: (member: Member) => void
  label?: string
  submitLabel?: string
}) {
  const t = useT()
  const inputId = useId()
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (trimmed === "") {
      setError(t("enterName"))
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const member = await addMember(slug, trimmed)
      setName("")
      onAdded(member)
    } catch {
      setError(t("addMemberError"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} aria-label={t("addMemberFormTitle")} className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <Label htmlFor={inputId}>{label ?? t("addMemberField")}</Label>
        <Input
          id={inputId}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={submitting}>
        {submitLabel ?? t("addMemberSubmitDefault")}
      </Button>
    </form>
  )
}
