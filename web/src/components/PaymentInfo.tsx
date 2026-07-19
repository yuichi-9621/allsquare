import { Button, Input, Label } from "@allsquare/ui"
import { type FormEvent, useId, useState } from "react"
import { setPaymentHandle } from "../lib/api"
import type { Member } from "../lib/types"

// Lets the identified member save where friends should send their money:
// @venmo-handle, paypal.me link, $cashtag, any URL, or plain instructions.
export function PaymentInfo({
  slug,
  member,
  onSaved,
}: {
  slug: string
  member: Member
  onSaved: () => void
}) {
  const inputId = useId()
  const [handle, setHandle] = useState(member.paymentHandle ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await setPaymentHandle(slug, member.id, handle.trim())
      onSaved()
    } catch {
      setError("Could not save your payment info.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} aria-label="Payment info" className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <Label htmlFor={inputId}>Where should people pay you?</Label>
        <Input
          id={inputId}
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="@venmo, paypal.me/you, $cashtag, or any link"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Shown as a Pay button next to transfers owed to you. Leave empty to remove it.
      </p>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={saving}>
        Save payment info
      </Button>
    </form>
  )
}
