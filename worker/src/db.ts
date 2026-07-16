import { newId, newSlug } from "./ids.js"
import type { Expense, GroupState, Member, Rounding, SplitEqual, SplitExact } from "./types.js"

export type GroupRow = {
  id: string
  slug: string
  title: string
  base_currency: string
  rounding: number
  created_at: string
}
type MemberRow = { id: string; name: string; sort_order: number }
type ExpenseRow = {
  id: string
  payer_member_id: string
  amount_minor: number
  currency: string
  fx_rate_to_base: number
  fx_rate_date: string
  description: string
  split_type: "equal" | "exact"
  created_at: string
}
type ShareRow = { member_id: string; share_amount_minor: number }

const EXPENSE_COLS =
  "id, payer_member_id, amount_minor, currency, fx_rate_to_base, fx_rate_date, description, split_type, created_at"

function toMember(r: MemberRow): Member {
  return { id: r.id, name: r.name, sortOrder: r.sort_order }
}

async function getShares(db: D1Database, expenseId: string): Promise<ShareRow[]> {
  const { results } = await db
    .prepare(
      "SELECT member_id, share_amount_minor FROM expense_shares WHERE expense_id = ? ORDER BY rowid",
    )
    .bind(expenseId)
    .all<ShareRow>()
  return results
}

async function toExpense(db: D1Database, row: ExpenseRow): Promise<Expense> {
  const shares = await getShares(db, row.id)
  const split: SplitEqual | SplitExact =
    row.split_type === "equal"
      ? { kind: "equal", participantIds: shares.map((s) => s.member_id) }
      : {
          kind: "exact",
          shares: shares.map((s) => ({
            memberId: s.member_id,
            amountMinor: s.share_amount_minor,
          })),
        }
  return {
    id: row.id,
    payerId: row.payer_member_id,
    amountMinor: row.amount_minor,
    currency: row.currency,
    fxRateToBase: row.fx_rate_to_base,
    fxRateDate: row.fx_rate_date,
    description: row.description,
    split,
    createdAt: row.created_at,
  }
}

async function getMembers(db: D1Database, groupId: string): Promise<Member[]> {
  const { results } = await db
    .prepare("SELECT id, name, sort_order FROM members WHERE group_id = ? ORDER BY sort_order")
    .bind(groupId)
    .all<MemberRow>()
  return results.map(toMember)
}

async function getExpenses(db: D1Database, groupId: string): Promise<Expense[]> {
  const { results } = await db
    .prepare(
      `SELECT ${EXPENSE_COLS} FROM expenses WHERE group_id = ? AND deleted_at IS NULL ORDER BY created_at, id`,
    )
    .bind(groupId)
    .all<ExpenseRow>()
  const expenses: Expense[] = []
  for (const row of results) expenses.push(await toExpense(db, row))
  return expenses
}

export type CreateGroupInput = {
  title: string
  baseCurrency: string
  rounding: Rounding
  memberNames: string[]
}

export async function createGroup(db: D1Database, input: CreateGroupInput): Promise<GroupState> {
  const groupId = newId()
  const slug = newSlug()
  const createdAt = new Date().toISOString()

  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        "INSERT INTO groups (id, slug, title, base_currency, rounding, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .bind(groupId, slug, input.title, input.baseCurrency, input.rounding, createdAt),
  ]
  const members: Member[] = input.memberNames.map((name, i) => {
    const id = newId()
    statements.push(
      db
        .prepare("INSERT INTO members (id, group_id, name, sort_order) VALUES (?, ?, ?, ?)")
        .bind(id, groupId, name, i),
    )
    return { id, name, sortOrder: i }
  })
  await db.batch(statements)

  return {
    group: {
      slug,
      title: input.title,
      baseCurrency: input.baseCurrency,
      rounding: input.rounding,
      createdAt,
    },
    members,
    expenses: [],
  }
}

export async function getGroupRow(db: D1Database, slug: string): Promise<GroupRow | null> {
  return await db.prepare("SELECT * FROM groups WHERE slug = ?").bind(slug).first<GroupRow>()
}

export async function getGroupState(db: D1Database, slug: string): Promise<GroupState | null> {
  const group = await getGroupRow(db, slug)
  if (!group) return null
  return {
    group: {
      slug: group.slug,
      title: group.title,
      baseCurrency: group.base_currency,
      rounding: group.rounding as Rounding,
      createdAt: group.created_at,
    },
    members: await getMembers(db, group.id),
    expenses: await getExpenses(db, group.id),
  }
}

export async function addMember(db: D1Database, groupId: string, name: string): Promise<Member> {
  const id = newId()
  // Single atomic statement: compute the next sort_order and insert in one
  // round trip so two concurrent adds can't read the same MAX and collide.
  const row = await db
    .prepare(
      "INSERT INTO members (id, group_id, name, sort_order) " +
        "SELECT ?, ?, ?, COALESCE(MAX(sort_order), -1) + 1 FROM members WHERE group_id = ? " +
        "RETURNING sort_order",
    )
    .bind(id, groupId, name, groupId)
    .first<{ sort_order: number }>()
  if (!row) throw new Error("addMember insert returned no row")
  return { id, name, sortOrder: row.sort_order }
}

export async function memberIds(db: D1Database, groupId: string): Promise<Set<string>> {
  const { results } = await db
    .prepare("SELECT id FROM members WHERE group_id = ?")
    .bind(groupId)
    .all<{ id: string }>()
  return new Set(results.map((r) => r.id))
}
