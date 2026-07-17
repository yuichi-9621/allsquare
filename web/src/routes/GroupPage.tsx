import { useCallback, useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { AddExpenseForm } from "../components/AddExpenseForm"
import { BalanceList } from "../components/BalanceList"
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
  // bump settlement refetch when the ledger changes (add/delete/poll). NOTE: uses expense
  // count; when inline-edit ships, switch to a content key so same-count edits also refresh.
  const revision = state?.expenses.length ?? 0
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
      />
      <AddExpenseForm group={group} members={members} defaultPayerId={activeId} onAdded={refresh} />
      <SettleUp group={group} members={members} revision={revision} />
    </main>
  )
}
