import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { expect, test, vi } from "vitest"
import { server } from "../test/server"
import { AddMember } from "./AddMember"

test("adds a member and calls onAdded with the created member", async () => {
  let posted: { name?: string } = {}
  server.use(
    http.post("http://localhost/api/groups/abc/members", async ({ request }) => {
      posted = (await request.json()) as { name?: string }
      return HttpResponse.json({ id: "m9", name: posted.name, sortOrder: 2 }, { status: 201 })
    }),
  )
  const onAdded = vi.fn()
  const user = userEvent.setup()
  render(<AddMember slug="abc" onAdded={onAdded} />)

  await user.type(screen.getByRole("textbox", { name: "Add member" }), "Chika")
  await user.click(screen.getByRole("button", { name: "Add member" }))

  await waitFor(() =>
    expect(onAdded).toHaveBeenCalledWith({ id: "m9", name: "Chika", sortOrder: 2 }),
  )
  expect(posted.name).toBe("Chika")
})

test("blocks an empty submission", async () => {
  const onAdded = vi.fn()
  const user = userEvent.setup()
  render(<AddMember slug="abc" onAdded={onAdded} />)
  await user.click(screen.getByRole("button", { name: "Add member" }))
  await screen.findByRole("alert")
  expect(onAdded).not.toHaveBeenCalled()
})

test("uses custom labels for the picker escape-hatch", () => {
  render(
    <AddMember
      slug="abc"
      onAdded={vi.fn()}
      label="Not listed? Add your name"
      submitLabel="Add & continue"
    />,
  )
  screen.getByRole("textbox", { name: "Not listed? Add your name" })
  screen.getByRole("button", { name: "Add & continue" })
})

test("surfaces an error when the request fails", async () => {
  server.use(
    http.post(
      "http://localhost/api/groups/abc/members",
      () => new HttpResponse(null, { status: 500 }),
    ),
  )
  const onAdded = vi.fn()
  const user = userEvent.setup()
  render(<AddMember slug="abc" onAdded={onAdded} />)
  await user.type(screen.getByRole("textbox", { name: "Add member" }), "X")
  await user.click(screen.getByRole("button", { name: "Add member" }))
  await screen.findByRole("alert")
  expect(onAdded).not.toHaveBeenCalled()
})
