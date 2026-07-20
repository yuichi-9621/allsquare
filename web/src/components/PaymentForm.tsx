import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@allsquare/ui"
import { type FormEvent, useState } from "react"
import { useT } from "../lib/i18n"
import { formatMoney, minorToInput, parseMajorToMinor } from "../lib/money"
import type { Member, Transfer } from "../lib/types"

// Records a real-world payback as a repayment expense. Reached from the
// "Payment" tab of the Add form so it sits behind the one obvious button, next
// to "Expense" — the same place people already look. Suggested transfers (the
// netted who-pays-who from settle-up) fill the fields in one tap, keeping the
// smart amounts; the fields stay editable for off-book or partial payments.
export function PaymentForm({
  members,
  transfers,
  baseCurrency,
  defaultFromId,
  onRecordPayment,
  onCancel,
}: {
  members: Member[]
  transfers: Transfer[] | null
  baseCurrency: string
  defaultFromId: string | null
  onRecordPayment: (fromId: string, toId: string, amountMinor: number) => Promise<void>
  onCancel: () => void
}) {
  const t = useT()
  const nameOf = new Map(members.map((m) => [m.id, m.name]))
  const suggested = transfers ?? []
  // Prefill from the suggested transfer the active member owes (they're usually
  // the one recording a payback), else the first suggestion, else empty fields.
  const mine = suggested.find((tr) => tr.from === defaultFromId) ?? suggested[0]
  const initialFrom = mine?.from ?? defaultFromId ?? members[0]?.id ?? ""
  const [fromId, setFromId] = useState(initialFrom)
  const [toId, setToId] = useState(mine?.to ?? members.find((m) => m.id !== initialFrom)?.id ?? "")
  const [amount, setAmount] = useState(mine ? minorToInput(mine.amountMinor, baseCurrency) : "")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const applyTransfer = (tr: Transfer) => {
    setFromId(tr.from)
    setToId(tr.to)
    setAmount(minorToInput(tr.amountMinor, baseCurrency))
    setError(null)
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (fromId === toId) {
      setError(t("samePayerPayeeError"))
      return
    }
    const amountMinor = parseMajorToMinor(amount, baseCurrency)
    if (amountMinor === null || amountMinor <= 0) {
      setError(t("invalidAmount"))
      return
    }
    setSubmitting(true)
    try {
      await onRecordPayment(fromId, toId, amountMinor)
      // Close the form; the parent's Undo toast handles reverting a mistake.
      onCancel()
    } catch {
      setError(t("recordPaymentError"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} aria-label={t("recordPayment")} className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{t("recordPayment")}</h2>

      {suggested.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {t("suggestedPayments")}
          </span>
          <div className="flex flex-wrap gap-2">
            {suggested.map((tr) => (
              <button
                key={`${tr.from}-${tr.to}-${tr.amountMinor}`}
                type="button"
                onClick={() => applyTransfer(tr)}
                className="rounded-full border border-input px-2.5 py-1 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                {nameOf.get(tr.from) ?? "?"} → {nameOf.get(tr.to) ?? "?"} ·{" "}
                {formatMoney(tr.amountMinor, baseCurrency)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pay-from-trigger">{t("paymentFromLabel")}</Label>
        <Select value={fromId} onValueChange={setFromId}>
          <SelectTrigger
            id="pay-from-trigger"
            aria-label={t("paymentFromLabel")}
            className="font-semibold"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pay-to-trigger">{t("paymentToLabel")}</Label>
        <Select value={toId} onValueChange={setToId}>
          <SelectTrigger
            id="pay-to-trigger"
            aria-label={t("paymentToLabel")}
            className="font-semibold"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pay-amount">
          {t("amount")} ({baseCurrency})
        </Label>
        <Input
          id="pay-amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex items-stretch gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={submitting} className="flex-1">
          {submitting ? t("saving") : t("recordPaymentButton")}
        </Button>
      </div>
    </form>
  )
}
