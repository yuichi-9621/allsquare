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
import { useT } from "../lib/i18n"
import { compileItems } from "../lib/items"
import { convertMinor, formatMoney, minorToInput, parseMajorToMinor } from "../lib/money"
import type { Expense, ExpenseBody, ExpenseItem, Group, Member } from "../lib/types"
import { MemberAvatar } from "./MemberAvatar"

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
  const t = useT()
  const base = group.baseCurrency
  const editing = expense !== undefined
  const [payerId, setPayerId] = useState(expense?.payerId ?? defaultPayerId ?? members[0]?.id ?? "")
  const [description, setDescription] = useState(expense?.description ?? "")
  const [category, setCategory] = useState<CategoryId>(
    (expense?.category as CategoryId | null | undefined) ?? "other",
  )
  const [splitKind, setSplitKind] = useState<"equal" | "exact" | "items">(
    expense?.items?.length ? "items" : (expense?.split.kind ?? "equal"),
  )
  // Items mode rows; amounts stay strings while typing (same as exact mode).
  type ItemRow = { name: string; amount: string; memberIds: string[] }
  const [itemRows, setItemRows] = useState<ItemRow[]>(() =>
    expense?.items?.length
      ? expense.items.map((it) => ({
          name: it.name,
          amount: minorToInput(it.amountMinor, expense.currency),
          memberIds: it.memberIds,
        }))
      : [{ name: "", amount: "", memberIds: members.map((m) => m.id) }],
  )
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
  const itemsTotalMinor = itemRows.reduce(
    (sum, r) => sum + (parseMajorToMinor(r.amount, currency) ?? 0),
    0,
  )

  // Editing without changing the currency keeps the ORIGINAL frozen rate
  // (the app's core promise), so preview against it — never a live rate.
  const frozenRate = expense && currency === expense.currency ? expense.fxRateToBase : null

  // The total currently entered (equal amount or exact sum), for the preview.
  const totalForPreview =
    splitKind === "equal"
      ? equalAmountMinor
      : splitKind === "exact"
        ? exactTotalMinor > 0
          ? exactTotalMinor
          : null
        : itemsTotalMinor > 0
          ? itemsTotalMinor
          : null

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
    if (e.items?.length) {
      setSplitKind("items")
      setItemRows(
        e.items.map((it) => ({
          name: it.name,
          amount: minorToInput(it.amountMinor, e.currency),
          memberIds: it.memberIds,
        })),
      )
      return
    }
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

  const setItemRow = (i: number, patch: Partial<ItemRow>) =>
    setItemRows((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const toggleItemMember = (i: number, memberId: string) =>
    setItemRows((rows) =>
      rows.map((r, j) => {
        if (j !== i) return r
        const has = r.memberIds.includes(memberId)
        return {
          ...r,
          memberIds: has ? r.memberIds.filter((m) => m !== memberId) : [...r.memberIds, memberId],
        }
      }),
    )

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (payerId === "" || description.trim() === "") {
      setError(t("payerDescRequired"))
      return
    }

    let body: ExpenseBody
    if (splitKind === "items") {
      const items: ExpenseItem[] = []
      for (const r of itemRows) {
        const amountMinor = parseMajorToMinor(r.amount, currency)
        if (r.name.trim() === "" || amountMinor === null || amountMinor <= 0) {
          setError(t("itemNameAmountRequired"))
          return
        }
        if (r.memberIds.length === 0) {
          setError(t("assignItemTo", { name: r.name.trim() }))
          return
        }
        // Keep assignee order stable (server member order) so shares compile
        // identically on every device.
        const memberIds = members.map((m) => m.id).filter((id) => r.memberIds.includes(id))
        items.push({ name: r.name.trim(), amountMinor, memberIds })
      }
      if (items.length === 0) {
        setError(t("addAtLeastOneItem"))
        return
      }
      body = {
        payerId,
        amountMinor: itemsTotalMinor,
        currency,
        description: description.trim(),
        category,
        items,
        split: { kind: "exact", shares: compileItems(items) },
      }
    } else if (splitKind === "equal") {
      if (equalAmountMinor === null) {
        setError(t("invalidAmount"))
        return
      }
      const participantIds = members.map((m) => m.id).filter((id) => participants.has(id))
      if (participantIds.length === 0) {
        setError(t("pickParticipant"))
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
        setError(t("enterExactAmounts"))
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
      setError(editing ? t("saveExpenseError") : t("addExpenseError"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      aria-label={editing ? t("editExpense") : t("addExpenseFormAria")}
      className="flex flex-col gap-4"
    >
      <h2 className="text-lg font-semibold">{editing ? t("editExpense") : t("addAnExpense")}</h2>
      {!editing && recent && recent.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {t("addAgain")}
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
        <Label htmlFor="payer-trigger">{t("whoPaid")}</Label>
        <Select value={payerId} onValueChange={setPayerId}>
          <SelectTrigger id="payer-trigger" aria-label={t("payerAria")} className="font-semibold">
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
        <Label htmlFor="description">{t("description")}</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <fieldset className="space-y-2.5">
        <legend className="mb-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {t("category")}
        </legend>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t("category")}>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              // biome-ignore lint/a11y/useSemanticElements: styled chip radios; native inputs can't take this treatment
              role="radio"
              aria-checked={category === c.id}
              onClick={() => setCategory(c.id)}
              className={`rounded-full border px-2.5 py-1 text-sm transition-colors ${
                category === c.id
                  ? "border-primary bg-primary/10 font-semibold text-foreground"
                  : "border-input text-muted-foreground"
              }`}
            >
              {c.emoji} {t(c.labelKey)}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2.5">
        <legend className="mb-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {t("split")}
        </legend>
        <RadioGroup
          value={splitKind}
          onValueChange={(value) => setSplitKind(value as "equal" | "exact" | "items")}
          className="gap-2.5"
        >
          <div className="flex items-center gap-2.5">
            <RadioGroupItem value="equal" id="split-equal" aria-label={t("equal")} />
            <Label htmlFor="split-equal" className="text-foreground">
              {t("equal")}
            </Label>
          </div>
          <div className="flex items-center gap-2.5">
            <RadioGroupItem value="exact" id="split-exact" aria-label={t("exact")} />
            <Label htmlFor="split-exact" className="text-foreground">
              {t("exact")}
            </Label>
          </div>
          <div className="flex items-center gap-2.5">
            <RadioGroupItem value="items" id="split-items" aria-label={t("items")} />
            <Label htmlFor="split-items" className="text-foreground">
              {t("items")}
            </Label>
          </div>
        </RadioGroup>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="currency-trigger">{t("currency")}</Label>
        <Select value={currency} onValueChange={setCurrency}>
          <SelectTrigger id="currency-trigger" aria-label={t("currency")}>
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

      {splitKind === "items" ? (
        <fieldset className="space-y-3">
          <legend className="mb-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {t("itemsLegend", { currency })}
          </legend>
          {itemRows.map((row, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional edit slots
            <div key={i} className="flex flex-col gap-1.5 rounded-md border border-input p-2.5">
              <div className="flex items-center gap-2">
                <Input
                  aria-label={t("itemNName", { n: i + 1 })}
                  placeholder={t("itemPlaceholder")}
                  value={row.name}
                  onChange={(e) => setItemRow(i, { name: e.target.value })}
                  className="min-w-0 flex-1"
                />
                <Input
                  aria-label={t("itemNAmount", { n: i + 1 })}
                  placeholder={t("amountPlaceholder")}
                  inputMode="decimal"
                  value={row.amount}
                  onChange={(e) => setItemRow(i, { amount: e.target.value })}
                  className="w-24 shrink-0"
                />
                {itemRows.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={t("removeItemN", { n: i + 1 })}
                    onClick={() => setItemRows((rows) => rows.filter((_, j) => j !== i))}
                  >
                    ✕
                  </Button>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {members.map((m) => {
                  const on = row.memberIds.includes(m.id)
                  return (
                    <button
                      key={m.id}
                      type="button"
                      aria-pressed={on}
                      aria-label={t("itemNMember", { n: i + 1, name: m.name })}
                      onClick={() => toggleItemMember(i, m.id)}
                      className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-sm transition-colors ${
                        on
                          ? "border-primary bg-primary/10 font-semibold text-foreground"
                          : "border-input text-muted-foreground"
                      }`}
                    >
                      <MemberAvatar
                        members={members}
                        memberId={m.id}
                        className="h-4 w-4 text-[0.55rem]"
                      />
                      {m.name}
                    </button>
                  )
                })}
                <button
                  type="button"
                  aria-label={t("itemNEveryone", { n: i + 1 })}
                  onClick={() => setItemRow(i, { memberIds: members.map((m) => m.id) })}
                  className="rounded-full border border-input px-2 py-0.5 text-sm text-muted-foreground"
                >
                  {t("everyone")}
                </button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setItemRows((rows) => [
                ...rows,
                { name: "", amount: "", memberIds: members.map((m) => m.id) },
              ])
            }
          >
            {t("addItem")}
          </Button>
          <p data-testid="items-total" className="text-sm">
            {t("totalAmount", { amount: formatMoney(itemsTotalMinor, currency) })}
          </p>
          {preview !== null ? (
            <p data-testid="fx-preview" className="text-sm text-muted-foreground">
              {t("approxBase", { amount: formatMoney(preview, base) })}
            </p>
          ) : null}
        </fieldset>
      ) : splitKind === "equal" ? (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="amount">{t("amount")}</Label>
            <Input
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
            />
          </div>
          {preview !== null ? (
            <p data-testid="fx-preview" className="text-sm text-muted-foreground">
              {t("approxBase", { amount: formatMoney(preview, base) })}
            </p>
          ) : null}
          <fieldset className="space-y-2.5">
            <legend className="mb-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
              {t("participants")}
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
            {t("exactAmountsLegend", { currency })}
          </legend>
          {members.map((m) => (
            <div key={m.id} className="flex flex-col gap-1.5">
              <Label htmlFor={`exact-${m.id}`}>{m.name}</Label>
              <Input
                id={`exact-${m.id}`}
                aria-label={t("exactAmountFor", { name: m.name })}
                value={exact[m.id] ?? ""}
                onChange={(e) => setExact((prev) => ({ ...prev, [m.id]: e.target.value }))}
                inputMode="decimal"
              />
            </div>
          ))}
          <p data-testid="exact-total" className="text-sm">
            {t("totalAmount", { amount: formatMoney(exactTotalMinor, currency) })}
          </p>
          {preview !== null ? (
            <p data-testid="fx-preview" className="text-sm text-muted-foreground">
              {t("approxBase", { amount: formatMoney(preview, base) })}
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
            {t("cancel")}
          </Button>
        ) : null}
        <Button type="submit" disabled={submitting} className="flex-1">
          {editing ? t("saveChanges") : t("addExpenseFormAria")}
        </Button>
      </div>
    </form>
  )
}
