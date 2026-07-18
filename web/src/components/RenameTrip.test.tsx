import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { expect, test, vi } from "vitest"
import { server } from "../test/server"
import { RenameTrip } from "./RenameTrip"

test("prefills the current title and PATCHes the new name", async () => {
  let patched: { title?: string } = {}
  server.use(
    http.patch("http://localhost/api/groups/abc", async ({ request }) => {
      patched = (await request.json()) as { title?: string }
      return HttpResponse.json({ group: {}, members: [], expenses: [] })
    }),
  )
  const onRenamed = vi.fn()
  const user = userEvent.setup()
  render(<RenameTrip slug="abc" title="Old trip" onRenamed={onRenamed} />)

  const input = screen.getByRole("textbox", { name: "Trip name" })
  expect(input).toHaveValue("Old trip")
  await user.clear(input)
  await user.type(input, "Kyoto 2026")
  await user.click(screen.getByRole("button", { name: "Save name" }))

  await waitFor(() => expect(onRenamed).toHaveBeenCalled())
  expect(patched.title).toBe("Kyoto 2026")
})

test("blocks an empty name", async () => {
  const onRenamed = vi.fn()
  const user = userEvent.setup()
  render(<RenameTrip slug="abc" title="Old trip" onRenamed={onRenamed} />)
  await user.clear(screen.getByRole("textbox", { name: "Trip name" }))
  await user.click(screen.getByRole("button", { name: "Save name" }))
  await screen.findByRole("alert")
  expect(onRenamed).not.toHaveBeenCalled()
})
