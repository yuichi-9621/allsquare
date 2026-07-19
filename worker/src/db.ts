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
type MemberRow = { id: string; name: string; sort_order: number; payment_handle: string | null }
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
  return {
    id: r.id,
    name: r.name,
    sortOrder: r.sort_order,
    paymentHandle: r.payment_handle ?? null,
  }
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
    .prepare(
      "SELECT id, name, sort_order, payment_handle FROM members WHERE group_id = ? ORDER BY sort_order",
    )
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
    return { id, name, sortOrder: i, paymentHandle: null }
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

export async function renameGroup(
  db: D1Database,
  slug: string,
  title: string,
): Promise<GroupState | null> {
  const group = await getGroupRow(db, slug)
  if (!group) return null
  await db.prepare("UPDATE groups SET title = ? WHERE id = ?").bind(title, group.id).run()
  return getGroupState(db, slug)
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
  return { id, name, sortOrder: row.sort_order, paymentHandle: null }
}

// Sets (or clears) a member's payment destination; null when the member
// doesn't belong to the group.
export async function setMemberPaymentHandle(
  db: D1Database,
  groupId: string,
  memberId: string,
  paymentHandle: string | null,
): Promise<Member | null> {
  const row = await db
    .prepare(
      "UPDATE members SET payment_handle = ? WHERE id = ? AND group_id = ? " +
        "RETURNING id, name, sort_order, payment_handle",
    )
    .bind(paymentHandle, memberId, groupId)
    .first<MemberRow>()
  return row ? toMember(row) : null
}

export async function memberIds(db: D1Database, groupId: string): Promise<Set<string>> {
  const { results } = await db
    .prepare("SELECT id FROM members WHERE group_id = ?")
    .bind(groupId)
    .all<{ id: string }>()
  return new Set(results.map((r) => r.id))
}

export type WriteExpenseInput = {
  groupId: string
  payerId: string
  amountMinor: number
  currency: string
  fxRateToBase: number
  fxRateDate: string
  description: string
  splitType: "equal" | "exact"
  shareRows: { memberId: string; amountMinor: number }[]
}

export async function getExpenseRow(
  db: D1Database,
  groupId: string,
  id: string,
): Promise<ExpenseRow | null> {
  return await db
    .prepare(
      `SELECT ${EXPENSE_COLS} FROM expenses WHERE id = ? AND group_id = ? AND deleted_at IS NULL`,
    )
    .bind(id, groupId)
    .first<ExpenseRow>()
}

export async function expenseToWire(
  db: D1Database,
  groupId: string,
  id: string,
): Promise<Expense | null> {
  const row = await getExpenseRow(db, groupId, id)
  return row ? await toExpense(db, row) : null
}

function shareStatements(
  db: D1Database,
  expenseId: string,
  shareRows: { memberId: string; amountMinor: number }[],
): D1PreparedStatement[] {
  return shareRows.map((s) =>
    db
      .prepare(
        "INSERT INTO expense_shares (expense_id, member_id, share_amount_minor) VALUES (?, ?, ?)",
      )
      .bind(expenseId, s.memberId, s.amountMinor),
  )
}

export async function insertExpense(db: D1Database, input: WriteExpenseInput): Promise<Expense> {
  const id = newId()
  const createdAt = new Date().toISOString()
  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        "INSERT INTO expenses (id, group_id, payer_member_id, amount_minor, currency, fx_rate_to_base, fx_rate_date, description, split_type, created_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)",
      )
      .bind(
        id,
        input.groupId,
        input.payerId,
        input.amountMinor,
        input.currency,
        input.fxRateToBase,
        input.fxRateDate,
        input.description,
        input.splitType,
        createdAt,
      ),
    ...shareStatements(db, id, input.shareRows),
  ]
  await db.batch(statements)
  const wire = await expenseToWire(db, input.groupId, id)
  if (!wire) throw new Error("insertExpense: expense missing immediately after insert")
  return wire
}

export async function updateExpense(
  db: D1Database,
  id: string,
  input: WriteExpenseInput,
): Promise<Expense> {
  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        "UPDATE expenses SET payer_member_id = ?, amount_minor = ?, currency = ?, fx_rate_to_base = ?, fx_rate_date = ?, description = ?, split_type = ? WHERE id = ? AND group_id = ?",
      )
      .bind(
        input.payerId,
        input.amountMinor,
        input.currency,
        input.fxRateToBase,
        input.fxRateDate,
        input.description,
        input.splitType,
        id,
        input.groupId,
      ),
    db.prepare("DELETE FROM expense_shares WHERE expense_id = ?").bind(id),
    ...shareStatements(db, id, input.shareRows),
  ]
  await db.batch(statements)
  const wire = await expenseToWire(db, input.groupId, id)
  if (!wire) throw new Error("updateExpense: expense missing immediately after update")
  return wire
}

export async function softDeleteExpense(
  db: D1Database,
  groupId: string,
  id: string,
): Promise<boolean> {
  const res = await db
    .prepare(
      "UPDATE expenses SET deleted_at = ? WHERE id = ? AND group_id = ? AND deleted_at IS NULL",
    )
    .bind(new Date().toISOString(), id, groupId)
    .run()
  return (res.meta.changes ?? 0) > 0
}
