import { Button, Card, CardContent } from "@allsquare/ui"
import { useCallback, useEffect, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import { AddMember } from "../components/AddMember"
import { BalanceList } from "../components/BalanceList"
import { ExpenseForm } from "../components/ExpenseForm"
import { ExpenseList } from "../components/ExpenseList"
import { InstallHint } from "../components/InstallHint"
import { MemberPicker } from "../components/MemberPicker"
import { MemberTotals } from "../components/MemberTotals"
import { SettleUp } from "../components/SettleUp"
import { ShareSummary } from "../components/ShareSummary"
import { TripMenu } from "../components/TripMenu"
import { useGroup } from "../hooks/useGroup"
import { useSettlement } from "../hooks/useSettlement"
import { getActiveMemberId, setActiveMemberId } from "../lib/activeMember"
import { addExpense, deleteExpense } from "../lib/api"
import { usePageMeta } from "../lib/pageMeta"
import { recordTrip } from "../lib/recentTrips"
import type { Member, Rounding, Transfer } from "../lib/types"

export function GroupPage() {
  const { slug = "" } = useParams()
  const { state, error, refresh } = useGroup(slug)
  const [activeId, setActiveId] = useState<string | null>(() => getActiveMemberId(slug))
  const [editingId, setEditingId] = useState<string | null>(null)
  // The expense form is collapsed by default so the overview leads; it opens on
  // demand (adding) or whenever an expense is being edited.
  const [adding, setAdding] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)
  // Settle-up shows EXACT cents by default; the trip menu can opt into rounding.
  const [rounding, setRounding] = useState<Rounding | undefined>(undefined)
  // The just-recorded repayment, undoable for a few seconds via a toast.
  const [undoId, setUndoId] = useState<string | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Trip pages are private invitations (secret slug): never indexed.
  usePageMeta({ title: `${state?.group.title ?? "Trip"} | Allsquare`, noindex: true })

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
  const onMarkPaid = useCallback(
    async (t: Transfer) => {
      if (!state) return
      const nameOf = new Map(state.members.map((m) => [m.id, m.name]))
      const created = await addExpense(slug, {
        payerId: t.from,
        amountMinor: t.amountMinor,
        currency: state.group.baseCurrency,
        description: `${nameOf.get(t.from) ?? "?"} paid ${nameOf.get(t.to) ?? "?"}`,
        split: { kind: "exact", shares: [{ memberId: t.to, amountMinor: t.amountMinor }] },
      })
      await refresh()
      // Offer an Undo window; recording again resets it to the newest one.
      if (undoTimer.current) clearTimeout(undoTimer.current)
      setUndoId(created.id)
      undoTimer.current = setTimeout(() => setUndoId(null), 6000)
    },
    [slug, state, refresh],
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
  }, [])

  // Bring the form into view when it opens — most useful when editing an
  // expense from the list further down the page. Guarded for jsdom (no scroll).
  useEffect(() => {
    if (adding || editingId !== null) {
      formRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" })
    }
  }, [adding, editingId])

  if (error) return <p role="alert">This group could not be loaded.</p>
  if (!state) return <p>Loading…</p>

  const { group, members, expenses } = state
  const shareUrl = `${window.location.origin}/g/${group.slug}`
  const editingExpense = editingId ? expenses.find((e) => e.id === editingId) : undefined
  const formOpen = adding || editingExpense !== undefined

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
              label="Not listed? Add your name"
              submitLabel="Add & continue"
              onAdded={addSelf}
            />
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">
          You are {members.find((m) => m.id === activeId)?.name ?? "a member"}.
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
                  />
                </CardContent>
              </Card>
            ) : (
              <Button type="button" size="lg" className="w-full" onClick={() => setAdding(true)}>
                Add an expense
              </Button>
            )}
          </div>

          <section aria-label="Expenses" className="flex flex-col gap-3">
            <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Expenses
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
          aria-label="Settle up section"
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
          <SettleUp
            transfers={settlement?.transfers ?? null}
            members={members}
            baseCurrency={group.baseCurrency}
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
          role="status"
          className="surface-paper fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-md border border-border/20 bg-card px-4 py-2.5 text-card-foreground shadow-lg"
        >
          <span className="text-sm">Marked paid.</span>
          <Button type="button" variant="outline" size="sm" onClick={undoMarkPaid}>
            Undo
          </Button>
        </div>
      ) : null}
    </main>
  )
}
