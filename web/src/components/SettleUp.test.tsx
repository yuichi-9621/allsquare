import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { expect, test } from "vitest"
import type { Group, Member } from "../lib/types"
import { server } from "../test/server"
import { SettleUp } from "./SettleUp"

const group: Group = {
  slug: "abc123",
  title: "Kyoto",
  baseCurrency: "JPY",
  rounding: 1,
  createdAt: "2026-07-16T00:00:00Z",
}
const members: Member[] = [
  { id: "m1", name: "Alice", sortOrder: 0 },
  { id: "m2", name: "Bob", sortOrder: 1 },
]

function handler() {
  return http.get("http://localhost/api/groups/abc123/settlement", ({ request }) => {
    const rounding = new URL(request.url).searchParams.get("rounding")
    const amount = rounding === "100" ? 15200 : 15150
    return HttpResponse.json({
      balances: [
        { memberId: "m1", netMinor: amount },
        { memberId: "m2", netMinor: -amount },
      ],
      transfers: [{ from: "m2", to: "m1", amountMinor: amount }],
    })
  })
}

test("renders transfers and re-queries when rounding changes", async () => {
  server.use(handler())
  const user = userEvent.setup()
  render(<SettleUp group={group} members={members} />)

  await waitFor(() => screen.getByText("Bob pays Alice ¥15,150"))
  await user.selectOptions(screen.getByRole("combobox", { name: "Round to" }), "100")
  await waitFor(() => screen.getByText("Bob pays Alice ¥15,200"))
})
