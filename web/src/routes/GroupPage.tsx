import { useCallback, useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { AddMember } from "../components/AddMember"
import { BalanceList } from "../components/BalanceList"
import { ExpenseForm } from "../components/ExpenseForm"
import { ExpenseList } from "../components/ExpenseList"
import { InstallHint } from "../components/InstallHint"
import { MemberPicker } from "../components/MemberPicker"
import { SettleUp } from "../components/SettleUp"
import { TripMenu } from "../components/TripMenu"
import { useGroup } from "../hooks/useGroup"
import { useSettlement } from "../hooks/useSettlement"
import { getActiveMemberId, setActiveMemberId } from "../lib/activeMember"
import { deleteExpense } from "../lib/api"
import { recordTrip } from "../lib/recentTrips"
import type { Member, Rounding } from "../lib/types"

export function GroupPage() {
  const { slug = "" } = useParams()
  const { state, error, refresh } = useGroup(slug)
  const [activeId, setActiveId] = useState<string | null>(() => getActiveMemberId(slug))
  const [editingId, setEditingId] = useState<string | null>(null)
  // Settle-up shows EXACT cents by default; the trip menu can opt into rounding.
  const [rounding, setRounding] = useState<Rounding | undefined>(undefined)

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

  if (error) return <p role="alert">This group could not be loaded.</p>
  if (!state) return <p>Loading…</p>

  const { group, members, expenses } = state
  const shareUrl = `${window.location.origin}/g/${group.slug}`
  const editingExpense = editingId ? expenses.find((e) => e.id === editingId) : undefined

  return (
    <main>
      <div className="trip-header">
        <h1>{group.title}</h1>
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
        <>
          <MemberPicker members={members} onPick={pick} />
          <AddMember
            slug={slug}
            label="Not listed? Add your name"
            submitLabel="Add & continue"
            onAdded={addSelf}
          />
        </>
      ) : (
        <p className="identity">
          You are {members.find((m) => m.id === activeId)?.name ?? "a member"}.
        </p>
      )}

      {/* Add an expense — the primary action, first. One form, two modes; a
          fresh key per target re-initialises it from the expense being edited. */}
      <ExpenseForm
        key={editingId ?? "new"}
        group={group}
        members={members}
        defaultPayerId={activeId}
        onAdded={refresh}
        expense={editingExpense}
        onCancel={editingExpense ? () => setEditingId(null) : undefined}
      />

      <section aria-label="Expenses" className="expenses-section">
        <h2>Expenses</h2>
        <ExpenseList
          expenses={expenses}
          members={members}
          baseCurrency={group.baseCurrency}
          onEdit={setEditingId}
          onDelete={onDeleteExpense}
        />
      </section>

      {/* Settle up — read last: where everyone stands, then who pays who. */}
      <section aria-label="Settle up section" className="settle-section">
        <BalanceList
          balances={settlement?.balances ?? []}
          members={members}
          baseCurrency={group.baseCurrency}
        />
        <SettleUp
          transfers={settlement?.transfers ?? null}
          members={members}
          baseCurrency={group.baseCurrency}
        />
      </section>

      <InstallHint />
    </main>
  )
}
