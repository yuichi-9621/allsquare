import type {
  CreateGroupBody,
  Expense,
  ExpenseBody,
  FxPreview,
  GroupState,
  Member,
  Rounding,
  Settlement,
} from "./types"

// Same-origin by default (Pages serves the SPA and the Worker shares the origin).
// Override in local dev with VITE_API_BASE. In jsdom tests the origin is
// http://localhost, so MSW handlers use absolute http://localhost/api/... URLs.
export const apiBase = import.meta.env.VITE_API_BASE ?? ""

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  })
  if (res.status === 204) return undefined as T
  const body = (await res.json().catch(() => null)) as {
    error?: { code?: string; message?: string }
  } | null
  if (!res.ok) {
    const err = body?.error
    throw new ApiError(res.status, err?.code ?? "unknown", err?.message ?? res.statusText)
  }
  return body as T
}

export function createGroup(body: CreateGroupBody): Promise<GroupState> {
  return request<GroupState>("/api/groups", { method: "POST", body: JSON.stringify(body) })
}

export function getGroup(slug: string): Promise<GroupState> {
  return request<GroupState>(`/api/groups/${encodeURIComponent(slug)}`)
}

export function addMember(slug: string, name: string): Promise<Member> {
  return request<Member>(`/api/groups/${encodeURIComponent(slug)}/members`, {
    method: "POST",
    body: JSON.stringify({ name }),
  })
}

export function addExpense(slug: string, body: ExpenseBody): Promise<Expense> {
  return request<Expense>(`/api/groups/${encodeURIComponent(slug)}/expenses`, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function editExpense(slug: string, id: string, body: ExpenseBody): Promise<Expense> {
  return request<Expense>(
    `/api/groups/${encodeURIComponent(slug)}/expenses/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(body) },
  )
}

export function deleteExpense(slug: string, id: string): Promise<void> {
  return request<void>(
    `/api/groups/${encodeURIComponent(slug)}/expenses/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  )
}

export function getSettlement(slug: string, rounding: Rounding): Promise<Settlement> {
  return request<Settlement>(
    `/api/groups/${encodeURIComponent(slug)}/settlement?rounding=${rounding}`,
  )
}

export function getFx(from: string, to: string, date: string): Promise<FxPreview> {
  const q = new URLSearchParams({ from, to, date })
  return request<FxPreview>(`/api/fx?${q.toString()}`)
}
