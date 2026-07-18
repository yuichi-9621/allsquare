import { type FormEvent, useEffect, useState } from "react"
import { addExpense, editExpense, getFx } from "../lib/api"
import { todayISODate } from "../lib/date"
import { convertMinor, formatMoney, minorToInput, parseMajorToMinor } from "../lib/money"
import type { Expense, ExpenseBody, Group, Member } from "../lib/types"

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "THB", "SGD"]

// Dual-mode expense form. With no `expense` it adds; with one it edits that
// expense in place (prefilled, "Save changes", plus Cancel). The parent gives
// each edit a fresh `key` so state re-initialises from the expense.
export function ExpenseForm({
  group,
  members,
  defaultPayerId,
  onAdded,
  expense,
  onCancel,
}: {
  group: Group
  members: Member[]
  defaultPayerId: string | null
  onAdded: () => void
  expense?: Expense | undefined
  onCancel?: (() => void) | undefined
}) {
  const base = group.baseCurrency
  const editing = expense !== undefined
  const [payerId, setPayerId] = useState(expense?.payerId ?? defaultPayerId ?? members[0]?.id ?? "")
  const [description, setDescription] = useState(expense?.description ?? "")
  const [splitKind, setSplitKind] = useState<"equal" | "exact">(expense?.split.kind ?? "equal")
  const [currency, setCurrency] = useState(expense?.currency ?? base)
  const [amount, setAmount] = useState(
    expense && expense.split.kind === "equal"
      ? minorToInput(expense.amountMinor, expense.currency)
      : "",
  )
  const [participants, setParticipants] = useState<Set<string>>(() =>
    expense?.split.kind === "equal"
      ? new Set(expense.split.participantIds)
      : new Set(members.map((m) => m.id)),
  )
  const [exact, setExact] = useState<Record<string, string>>(() =>
    expense?.split.kind === "exact"
      ? Object.fromEntries(
          expense.split.shares.map((s) => [
            s.memberId,
            minorToInput(s.amountMinor, expense.currency),
          ]),
        )
      : {},
  )
  const [preview, setPreview] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Both split kinds work in the selected currency (exact is no longer pinned
  // to base). The base value is derived — by the server at settlement, and here
  // only for the "≈ base" preview.
  const equalAmountMinor = parseMajorToMinor(amount, currency)
  const exactTotalMinor = members.reduce(
    (sum, m) => sum + (parseMajorToMinor(exact[m.id] ?? "", currency) ?? 0),
    0,
  )

  // Editing without changing the currency keeps the ORIGINAL frozen rate
  // (the app's core promise), so preview against it — never a live rate.
  const frozenRate = expense && currency === expense.currency ? expense.fxRateToBase : null

  // The total currently entered (equal amount or exact sum), for the preview.
  const totalForPreview =
    splitKind === "equal" ? equalAmountMinor : exactTotalMinor > 0 ? exactTotalMinor : null

  // "≈ base" preview when the expense is in a non-base currency. Uses the frozen
  // rate when it applies; otherwise a live GET /api/fx (matching the server,
  // which re-freezes only when the currency changes).
  useEffect(() => {
    if (currency === base || totalForPreview === null) {
      setPreview(null)
      return
    }
    if (frozenRate !== null) {
      setPreview(convertMinor(totalForPreview, currency, base, frozenRate))
      return
    }
    let alive = true
    getFx(currency, base, todayISODate())
      .then((fx) => {
        if (alive) setPreview(convertMinor(totalForPreview, currency, base, fx.rate))
      })
      .catch(() => {
        if (alive) setPreview(null)
      })
    return () => {
      alive = false
    }
  }, [currency, base, totalForPreview, frozenRate])

  const toggleParticipant = (id: string) =>
    setParticipants((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (payerId === "" || description.trim() === "") {
      setError("Choose a payer and add a description.")
      return
    }

    let body: ExpenseBody
    if (splitKind === "equal") {
      if (equalAmountMinor === null) {
        setError("Enter a valid amount.")
        return
      }
      const participantIds = members.map((m) => m.id).filter((id) => participants.has(id))
      if (participantIds.length === 0) {
        setError("Pick at least one participant.")
        return
      }
      body = {
        payerId,
        amountMinor: equalAmountMinor,
        currency,
        description: description.trim(),
        split: { kind: "equal", participantIds },
      }
    } else {
      const shares = members
        .map((m) => ({
          memberId: m.id,
          amountMinor: parseMajorToMinor(exact[m.id] ?? "", currency) ?? 0,
        }))
        .filter((s) => s.amountMinor > 0)
      if (shares.length === 0) {
        setError("Enter each person's exact amount.")
        return
      }
      body = {
        payerId,
        amountMinor: exactTotalMinor,
        currency,
        description: description.trim(),
        split: { kind: "exact", shares },
      }
    }

    setSubmitting(true)
    try {
      if (editing) {
        await editExpense(group.slug, expense.id, body)
        onAdded()
        onCancel?.()
      } else {
        await addExpense(group.slug, body)
        setDescription("")
        setAmount("")
        setExact({})
        onAdded()
      }
    } catch {
      setError(editing ? "Could not save the expense." : "Could not add the expense.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} aria-label={editing ? "Edit expense" : "Add expense"}>
      <h2>{editing ? "Edit expense" : "Add an expense"}</h2>
      <label>
        Payer
        <select value={payerId} onChange={(e) => setPayerId(e.target.value)}>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Description
        <input value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <fieldset>
        <legend>Split</legend>
        <label>
          <input
            type="radio"
            name="splitKind"
            checked={splitKind === "equal"}
            onChange={() => setSplitKind("equal")}
          />
          Equal
        </label>
        <label>
          <input
            type="radio"
            name="splitKind"
            checked={splitKind === "exact"}
            onChange={() => setSplitKind("exact")}
          />
          Exact
        </label>
      </fieldset>

      <label>
        Currency
        <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      {splitKind === "equal" ? (
        <>
          <label>
            Amount
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
          </label>
          {preview !== null ? <p data-testid="fx-preview">≈ {formatMoney(preview, base)}</p> : null}
          <fieldset>
            <legend>Participants</legend>
            {members.map((m) => (
              <label key={m.id}>
                <input
                  type="checkbox"
                  checked={participants.has(m.id)}
                  onChange={() => toggleParticipant(m.id)}
                />
                {m.name}
              </label>
            ))}
          </fieldset>
        </>
      ) : (
        <fieldset>
          <legend>Exact amounts ({currency})</legend>
          {members.map((m) => (
            <label key={m.id}>
              {m.name}
              <input
                aria-label={`Exact amount for ${m.name}`}
                value={exact[m.id] ?? ""}
                onChange={(e) => setExact((prev) => ({ ...prev, [m.id]: e.target.value }))}
                inputMode="decimal"
              />
            </label>
          ))}
          <p data-testid="exact-total">Total {formatMoney(exactTotalMinor, currency)}</p>
          {preview !== null ? <p data-testid="fx-preview">≈ {formatMoney(preview, base)}</p> : null}
        </fieldset>
      )}

      {error ? <p role="alert">{error}</p> : null}
      <div className="form-actions">
        {editing && onCancel ? (
          <button type="button" className="ghost" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
        <button type="submit" disabled={submitting}>
          {editing ? "Save changes" : "Add expense"}
        </button>
      </div>
    </form>
  )
}
