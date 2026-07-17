import { type FormEvent, useEffect, useState } from "react"
import { addExpense, getFx } from "../lib/api"
import { todayISODate } from "../lib/date"
import { convertMinor, formatMoney, parseMajorToMinor } from "../lib/money"
import type { ExpenseBody, Group, Member } from "../lib/types"

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "THB", "SGD"]

export function AddExpenseForm({
  group,
  members,
  defaultPayerId,
  onAdded,
}: {
  group: Group
  members: Member[]
  defaultPayerId: string | null
  onAdded: () => void
}) {
  const base = group.baseCurrency
  const [payerId, setPayerId] = useState(defaultPayerId ?? members[0]?.id ?? "")
  const [description, setDescription] = useState("")
  const [splitKind, setSplitKind] = useState<"equal" | "exact">("equal")
  const [currency, setCurrency] = useState(base)
  const [amount, setAmount] = useState("")
  const [participants, setParticipants] = useState<Set<string>>(
    () => new Set(members.map((m) => m.id)),
  )
  const [exact, setExact] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Exact shares are entered in the base currency (contract §Types), so pin the
  // currency to base while "exact" is active.
  const effectiveCurrency = splitKind === "exact" ? base : currency
  const equalAmountMinor = parseMajorToMinor(amount, effectiveCurrency)

  // Live "≈ base" preview via GET /api/fx (equal splits, non-base currency only).
  useEffect(() => {
    if (splitKind === "exact" || effectiveCurrency === base || equalAmountMinor === null) {
      setPreview(null)
      return
    }
    let alive = true
    getFx(effectiveCurrency, base, todayISODate())
      .then((fx) => {
        if (alive) setPreview(convertMinor(equalAmountMinor, effectiveCurrency, base, fx.rate))
      })
      .catch(() => {
        if (alive) setPreview(null)
      })
    return () => {
      alive = false
    }
  }, [splitKind, effectiveCurrency, base, equalAmountMinor])

  const toggleParticipant = (id: string) =>
    setParticipants((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const exactTotalMinor = members.reduce(
    (sum, m) => sum + (parseMajorToMinor(exact[m.id] ?? "", base) ?? 0),
    0,
  )

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
        currency: effectiveCurrency,
        description: description.trim(),
        split: { kind: "equal", participantIds },
      }
    } else {
      const shares = members
        .map((m) => ({
          memberId: m.id,
          amountMinor: parseMajorToMinor(exact[m.id] ?? "", base) ?? 0,
        }))
        .filter((s) => s.amountMinor > 0)
      if (shares.length === 0) {
        setError("Enter each person's exact amount.")
        return
      }
      body = {
        payerId,
        amountMinor: exactTotalMinor,
        currency: base,
        description: description.trim(),
        split: { kind: "exact", shares },
      }
    }

    setSubmitting(true)
    try {
      await addExpense(group.slug, body)
      setDescription("")
      setAmount("")
      setExact({})
      onAdded()
    } catch {
      setError("Could not add the expense.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} aria-label="Add expense">
      <h2>Add an expense</h2>
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
          Exact (in {base})
        </label>
      </fieldset>

      {splitKind === "equal" ? (
        <>
          <label>
            Amount
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
          </label>
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
          <legend>Exact amounts ({base})</legend>
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
          <p data-testid="exact-total">Total {formatMoney(exactTotalMinor, base)}</p>
        </fieldset>
      )}

      {error ? <p role="alert">{error}</p> : null}
      <button type="submit" disabled={submitting}>
        Add expense
      </button>
    </form>
  )
}
