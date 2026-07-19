import {
  Button,
  Checkbox,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@allsquare/ui"
import { type FormEvent, useEffect, useState } from "react"
import { addExpense, editExpense, getFx } from "../lib/api"
import { CATEGORIES, type CategoryId } from "../lib/categories"
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
  recent,
}: {
  group: Group
  members: Member[]
  defaultPayerId: string | null
  onAdded: () => void
  expense?: Expense | undefined
  onCancel?: (() => void) | undefined
  recent?: Expense[] | undefined
}) {
  const base = group.baseCurrency
  const editing = expense !== undefined
  const [payerId, setPayerId] = useState(expense?.payerId ?? defaultPayerId ?? members[0]?.id ?? "")
  const [description, setDescription] = useState(expense?.description ?? "")
  const [category, setCategory] = useState<CategoryId>(
    (expense?.category as CategoryId | null | undefined) ?? "other",
  )
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

  // Quick re-add: copy a recent expense's fields (not the payer — whoever is
  // adding now probably paid this time).
  const prefill = (e: Expense) => {
    setDescription(e.description)
    setCurrency(e.currency)
    setCategory((e.category as CategoryId | null | undefined) ?? "other")
    setSplitKind(e.split.kind)
    if (e.split.kind === "equal") {
      setAmount(minorToInput(e.amountMinor, e.currency))
      setParticipants(new Set(e.split.participantIds))
    } else {
      setExact(
        Object.fromEntries(
          e.split.shares.map((s) => [s.memberId, minorToInput(s.amountMinor, e.currency)]),
        ),
      )
    }
  }

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
        category,
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
        category,
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
    <form
      onSubmit={onSubmit}
      aria-label={editing ? "Edit expense" : "Add expense"}
      className="flex flex-col gap-4"
    >
      <h2 className="text-lg font-semibold">{editing ? "Edit expense" : "Add an expense"}</h2>
      {!editing && recent && recent.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Add again
          </span>
          <div className="flex flex-wrap gap-2">
            {recent.map((e) => (
              <Button
                key={e.id}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => prefill(e)}
              >
                {e.description} · {formatMoney(e.amountMinor, e.currency)}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="payer-trigger">Who paid?</Label>
        <Select value={payerId} onValueChange={setPayerId}>
          <SelectTrigger id="payer-trigger" aria-label="Payer" className="font-semibold">
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
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <fieldset className="space-y-2.5">
        <legend className="mb-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Category
        </legend>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Category">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={category === c.id}
              onClick={() => setCategory(c.id)}
              className={`rounded-full border px-2.5 py-1 text-sm transition-colors ${
                category === c.id
                  ? "border-primary bg-primary/10 font-semibold text-foreground"
                  : "border-input text-muted-foreground"
              }`}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2.5">
        <legend className="mb-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Split
        </legend>
        <RadioGroup
          value={splitKind}
          onValueChange={(value) => setSplitKind(value as "equal" | "exact")}
          className="gap-2.5"
        >
          <div className="flex items-center gap-2.5">
            <RadioGroupItem value="equal" id="split-equal" aria-label="Equal" />
            <Label htmlFor="split-equal" className="text-foreground">
              Equal
            </Label>
          </div>
          <div className="flex items-center gap-2.5">
            <RadioGroupItem value="exact" id="split-exact" aria-label="Exact" />
            <Label htmlFor="split-exact" className="text-foreground">
              Exact
            </Label>
          </div>
        </RadioGroup>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="currency-trigger">Currency</Label>
        <Select value={currency} onValueChange={setCurrency}>
          <SelectTrigger id="currency-trigger" aria-label="Currency">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {splitKind === "equal" ? (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
            />
          </div>
          {preview !== null ? (
            <p data-testid="fx-preview" className="text-sm text-muted-foreground">
              ≈ {formatMoney(preview, base)}
            </p>
          ) : null}
          <fieldset className="space-y-2.5">
            <legend className="mb-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Participants
            </legend>
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-2.5">
                <Checkbox
                  id={`participant-${m.id}`}
                  aria-label={m.name}
                  checked={participants.has(m.id)}
                  onCheckedChange={() => toggleParticipant(m.id)}
                />
                <Label htmlFor={`participant-${m.id}`} className="text-foreground">
                  {m.name}
                </Label>
              </div>
            ))}
          </fieldset>
        </>
      ) : (
        <fieldset className="space-y-2.5">
          <legend className="mb-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Exact amounts ({currency})
          </legend>
          {members.map((m) => (
            <div key={m.id} className="flex flex-col gap-1.5">
              <Label htmlFor={`exact-${m.id}`}>{m.name}</Label>
              <Input
                id={`exact-${m.id}`}
                aria-label={`Exact amount for ${m.name}`}
                value={exact[m.id] ?? ""}
                onChange={(e) => setExact((prev) => ({ ...prev, [m.id]: e.target.value }))}
                inputMode="decimal"
              />
            </div>
          ))}
          <p data-testid="exact-total" className="text-sm">
            Total {formatMoney(exactTotalMinor, currency)}
          </p>
          {preview !== null ? (
            <p data-testid="fx-preview" className="text-sm text-muted-foreground">
              ≈ {formatMoney(preview, base)}
            </p>
          ) : null}
        </fieldset>
      )}

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex items-stretch gap-2">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={submitting} className="flex-1">
          {editing ? "Save changes" : "Add expense"}
        </Button>
      </div>
    </form>
  )
}
