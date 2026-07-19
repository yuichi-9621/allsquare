import { Button, Input, Label } from "@allsquare/ui"
import { type FormEvent, useId, useState } from "react"
import { setPaymentHandle } from "../lib/api"
import { useT } from "../lib/i18n"
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
  const t = useT()
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
      setError(t("paymentInfoError"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} aria-label={t("paymentInfoForm")} className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <Label htmlFor={inputId}>{t("paymentWhere")}</Label>
        <Input
          id={inputId}
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder={t("paymentPlaceholder")}
        />
      </div>
      <p className="text-xs text-muted-foreground">{t("paymentHelp")}</p>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={saving}>
        {t("savePaymentInfo")}
      </Button>
    </form>
  )
}
