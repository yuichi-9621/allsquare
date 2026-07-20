import { Button, Card, CardContent, cn } from "@allsquare/ui"
import { useCallback, useEffect, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import { AddMember } from "../components/AddMember"
import { BalanceList } from "../components/BalanceList"
import { ExpenseForm } from "../components/ExpenseForm"
import { ExpenseList } from "../components/ExpenseList"
import { InstallHint } from "../components/InstallHint"
import { MemberPicker } from "../components/MemberPicker"
import { MemberTotals } from "../components/MemberTotals"
import { PaymentForm } from "../components/PaymentForm"
import { SettleUp } from "../components/SettleUp"
import { ShareSummary } from "../components/ShareSummary"
import { SpendingBreakdown } from "../components/SpendingBreakdown"
import { TripMenu } from "../components/TripMenu"
import { useGroup } from "../hooks/useGroup"
import { useSettlement } from "../hooks/useSettlement"
import { getActiveMemberId, setActiveMemberId } from "../lib/activeMember"
import { addExpense, deleteExpense } from "../lib/api"
import { useT } from "../lib/i18n"
import { usePageMeta } from "../lib/pageMeta"
import { recordTrip } from "../lib/recentTrips"
import { isRepayment } from "../lib/shareCard"
import type { Member, Rounding, Transfer } from "../lib/types"

export function GroupPage() {
  const t = useT()
  const { slug = "" } = useParams()
  const { state, error, refresh } = useGroup(slug)
  const [activeId, setActiveId] = useState<string | null>(() => getActiveMemberId(slug))
  const [editingId, setEditingId] = useState<string | null>(null)
  // The expense form is collapsed by default so the overview leads; it opens on
  // demand (adding) or whenever an expense is being edited.
  const [adding, setAdding] = useState(false)
  // When adding (not editing), the form has two tabs: a spending Expense and a
  // Payment (settle up). Payment lives here so it's behind the one obvious
  // button, which is where people who mean to record a payback actually look.
  const [formMode, setFormMode] = useState<"expense" | "payment">("expense")
  const formRef = useRef<HTMLDivElement>(null)
  // Settle-up shows EXACT cents by default; the trip menu can opt into rounding.
  const [rounding, setRounding] = useState<Rounding | undefined>(undefined)
  // The just-recorded repayment, undoable for a few seconds via a toast.
  const [undoId, setUndoId] = useState<string | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Trip pages are private invitations (secret slug): never indexed.
  usePageMeta({
    title: t("groupPageMetaTitle", { title: state?.group.title ?? t("tripFallback") }),
    noindex: true,
  })

  // Content key (not count) so a same-count edit still refetches balances.
  const revision = JSON.stringify(state?.expenses ?? [])
  const settlement = useSettlement(slug, rounding, revision)

  // Remember every group opened on this device so it shows on the dashboard.
  useEffect(() => {
    const g = state?.group
    if (g) {
      recordTrip({
        slug: g.slug,
        title: g.title,
        baseCurrency: g.baseCurrency,
        rounding: g.rounding,
      })
    }
  }, [state?.group])

  const pick = useCallback(
    (memberId: string) => {
      setActiveMemberId(slug, memberId)
      setActiveId(memberId)
    },
    [slug],
  )

  // Adding yourself from the "who are you?" screen also identifies you.
  const addSelf = useCallback(
    async (member: Member) => {
      await refresh()
      pick(member.id)
    },
    [refresh, pick],
  )

  const onDeleteExpense = useCallback(
    async (expenseId: string) => {
      await deleteExpense(slug, expenseId)
      await refresh()
    },
    [slug, refresh],
  )

  // Recording a payment IS an expense: the debtor "paid for" the creditor's
  // full amount, so both balances cancel and the transfer disappears. Base
  // currency, so no FX freeze is involved; deletable like any expense to undo.
  // Shared by the Mark-paid buttons (SettleRow) and the Payment tab of the form.
  const recordPayment = useCallback(
    async (fromId: string, toId: string, amountMinor: number) => {
      if (!state) return
      const nameOf = new Map(state.members.map((m) => [m.id, m.name]))
      const created = await addExpense(slug, {
        kind: "repayment",
        payerId: fromId,
        amountMinor,
        currency: state.group.baseCurrency,
        // Stored data, not UI: the ledger always keeps this literal English
        // "X paid Y" shape regardless of locale (see lib/shareCard.ts's
        // isRepayment heuristic and ExpenseCard's repaymentTitle template,
        // which renders this kind of row locale-aware from payerId/shares).
        description: `${nameOf.get(fromId) ?? "?"} paid ${nameOf.get(toId) ?? "?"}`,
        split: { kind: "exact", shares: [{ memberId: toId, amountMinor }] },
      })
      await refresh()
      // Offer an Undo window; recording again resets it to the newest one.
      if (undoTimer.current) clearTimeout(undoTimer.current)
      setUndoId(created.id)
      undoTimer.current = setTimeout(() => setUndoId(null), 6000)
    },
    [slug, state, refresh],
  )

  const onMarkPaid = useCallback(
    (transfer: Transfer) => recordPayment(transfer.from, transfer.to, transfer.amountMinor),
    [recordPayment],
  )

  const undoMarkPaid = useCallback(async () => {
    if (!undoId) return
    if (undoTimer.current) clearTimeout(undoTimer.current)
    setUndoId(null)
    await deleteExpense(slug, undoId)
    await refresh()
  }, [undoId, slug, refresh])

  // Don't fire the toast timer against an unmounted page.
  useEffect(() => {
    return () => {
      if (undoTimer.current) clearTimeout(undoTimer.current)
    }
  }, [])

  const closeForm = useCallback(() => {
    setAdding(false)
    setEditingId(null)
    setFormMode("expense")
  }, [])

  // Bring the form into view when it opens — most useful when editing an
  // expense from the list further down the page. Guarded for jsdom (no scroll).
  useEffect(() => {
    if (adding || editingId !== null) {
      formRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" })
    }
  }, [adding, editingId])

  if (error) return <p role="alert">{t("groupLoadError")}</p>
  if (!state) return <p>{t("loading")}</p>

  const { group, members, expenses } = state
  const shareUrl = `${window.location.origin}/g/${group.slug}`
  const editingExpense = editingId ? expenses.find((e) => e.id === editingId) : undefined
  const formOpen = adding || editingExpense !== undefined

  // "Add again" chips: the last three distinct real expenses, newest first
  // (repayments are bookkeeping, not things you'd re-add).
  const recent: typeof expenses = []
  const seenDescriptions = new Set<string>()
  for (let i = expenses.length - 1; i >= 0 && recent.length < 3; i--) {
    const e = expenses[i]
    if (!e || isRepayment(e, members) || seenDescriptions.has(e.description)) continue
    seenDescriptions.add(e.description)
    recent.push(e)
  }

  return (
    <main className="flex w-full flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
          {group.title}
        </h1>
        <TripMenu
          slug={slug}
          title={group.title}
          shareUrl={shareUrl}
          rounding={rounding}
          activeMember={members.find((m) => m.id === activeId) ?? null}
          onRounding={setRounding}
          onChanged={refresh}
        />
      </div>

      {activeId === null ? (
        <Card>
          <CardContent className="gap-4 pt-4">
            <MemberPicker members={members} onPick={pick} />
            <AddMember
              slug={slug}
              label={t("notListedAddName")}
              submitLabel={t("addAndContinue")}
              onAdded={addSelf}
            />
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t("youAreText", {
            name: members.find((m) => m.id === activeId)?.name ?? t("unknownMember"),
          })}
        </p>
      )}

      {/* Desktop splits into a working column (add + expenses) and a sticky
          summary rail (balances + settle up); on mobile both stack in the
          same order as before. */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {/* Add an expense — the primary action, first. Collapsed to a button so
          the overview (expenses + settle-up) leads; the form opens on demand,
          or when editing an expense. One form, two modes; a fresh key per
          target re-initialises it from the expense being edited. */}
          <div ref={formRef}>
            {formOpen ? (
              <Card>
                <CardContent className="gap-4 pt-4">
                  {/* Expense vs Payment tabs — only when adding; editing an
                  expense stays on the expense form. */}
                  {editingExpense === undefined ? (
                    <div
                      role="radiogroup"
                      aria-label={t("paymentTabsAria")}
                      className="flex gap-1 rounded-md border border-input p-1"
                    >
                      {(
                        [
                          ["expense", t("modeExpense")],
                          ["payment", t("modePayment")],
                        ] as const
                      ).map(([mode, label]) => (
                        <button
                          key={mode}
                          type="button"
                          // biome-ignore lint/a11y/useSemanticElements: styled segmented radios
                          role="radio"
                          aria-checked={formMode === mode}
                          onClick={() => setFormMode(mode)}
                          className={cn(
                            "flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors",
                            formMode === mode
                              ? "bg-primary/10 text-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {editingExpense === undefined && formMode === "payment" ? (
                    <PaymentForm
                      members={members}
                      transfers={settlement?.transfers ?? null}
                      baseCurrency={group.baseCurrency}
                      defaultFromId={activeId}
                      onRecordPayment={recordPayment}
                      onCancel={closeForm}
                    />
                  ) : (
                    <ExpenseForm
                      key={editingId ?? "new"}
                      group={group}
                      members={members}
                      defaultPayerId={activeId}
                      onAdded={async () => {
                        await refresh()
                        closeForm()
                      }}
                      expense={editingExpense}
                      onCancel={closeForm}
                      recent={recent}
                    />
                  )}
                </CardContent>
              </Card>
            ) : (
              <Button
                type="button"
                size="lg"
                className="w-full"
                onClick={() => {
                  setFormMode("expense")
                  setAdding(true)
                }}
              >
                {t("addAnExpense")}
              </Button>
            )}
          </div>

          <section aria-label={t("expenses")} className="flex flex-col gap-3">
            <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              {t("expenses")}
            </h2>
            <ExpenseList
              expenses={expenses}
              members={members}
              baseCurrency={group.baseCurrency}
              onEdit={setEditingId}
              onDelete={onDeleteExpense}
            />
          </section>
        </div>

        {/* Settle up — read last on mobile, always in view on desktop. */}
        <section
          aria-label={t("settleUpSection")}
          className="flex w-full flex-col gap-3 lg:sticky lg:top-6 lg:w-80 lg:shrink-0"
        >
          <BalanceList
            balances={settlement?.balances ?? []}
            members={members}
            baseCurrency={group.baseCurrency}
          />
          <MemberTotals
            expenses={expenses}
            members={members}
            balances={settlement?.balances ?? []}
            baseCurrency={group.baseCurrency}
          />
          <SpendingBreakdown
            expenses={expenses}
            members={members}
            baseCurrency={group.baseCurrency}
          />
          <SettleUp
            transfers={settlement?.transfers ?? null}
            members={members}
            baseCurrency={group.baseCurrency}
            note={group.title}
            onMarkPaid={onMarkPaid}
          />
          {settlement?.transfers?.length === 0 && expenses.length > 0 ? (
            <ShareSummary group={group} members={members} expenses={expenses} />
          ) : null}
        </section>
      </div>

      <InstallHint />

      {undoId ? (
        <div
          // biome-ignore lint/a11y/useSemanticElements: toast live region; output element is form-associated and wrong here
          role="status"
          className="surface-paper fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-md border border-border/20 bg-card px-4 py-2.5 text-card-foreground shadow-lg"
        >
          <span className="text-sm">{t("markedPaid")}</span>
          <Button type="button" variant="outline" size="sm" onClick={undoMarkPaid}>
            {t("undo")}
          </Button>
        </div>
      ) : null}
    </main>
  )
}
