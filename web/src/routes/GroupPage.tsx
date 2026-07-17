import { useCallback, useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { BalanceList } from "../components/BalanceList"
import { ExpenseForm } from "../components/ExpenseForm"
import { ExpenseList } from "../components/ExpenseList"
import { InstallHint } from "../components/InstallHint"
import { MemberPicker } from "../components/MemberPicker"
import { SettleUp } from "../components/SettleUp"
import { ShareBar } from "../components/ShareBar"
import { useGroup } from "../hooks/useGroup"
import { useSettlement } from "../hooks/useSettlement"
import { getActiveMemberId, setActiveMemberId } from "../lib/activeMember"
import { deleteExpense } from "../lib/api"
import { recordTrip } from "../lib/recentTrips"

export function GroupPage() {
  const { slug = "" } = useParams()
  const { state, error, refresh } = useGroup(slug)
  const [activeId, setActiveId] = useState<string | null>(() => getActiveMemberId(slug))
  const [editingId, setEditingId] = useState<string | null>(null)
  // Refetch settlement whenever the ledger's CONTENT changes (add / delete /
  // edit / poll). A content key — not the expense count — so an edit that keeps
  // the same number of expenses still refreshes balances.
  const revision = JSON.stringify(state?.expenses ?? [])
  const settlement = useSettlement(slug, state?.group.rounding ?? 1, revision)

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
      <h1>{group.title}</h1>
      <ShareBar url={shareUrl} />
      <InstallHint />
      {activeId === null ? (
        <MemberPicker members={members} onPick={pick} />
      ) : (
        <p>You are {members.find((m) => m.id === activeId)?.name ?? "a member"}.</p>
      )}
      <BalanceList
        balances={settlement?.balances ?? []}
        members={members}
        baseCurrency={group.baseCurrency}
      />
      <ExpenseList
        expenses={expenses}
        members={members}
        baseCurrency={group.baseCurrency}
        onDelete={onDeleteExpense}
        onEdit={setEditingId}
      />
      {/* One form area, two modes. A fresh key per target re-initialises the
          form state from the expense being edited (or resets to "add"). */}
      <ExpenseForm
        key={editingId ?? "new"}
        group={group}
        members={members}
        defaultPayerId={activeId}
        onAdded={refresh}
        expense={editingExpense}
        onCancel={editingExpense ? () => setEditingId(null) : undefined}
      />
      <SettleUp group={group} members={members} revision={revision} />
    </main>
  )
}
