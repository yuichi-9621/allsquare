import { Button, Card, CardContent, Input, Label } from "@allsquare/ui"
import { type FormEvent, useState } from "react"
import { useNavigate } from "react-router-dom"
import { createGroup } from "../lib/api"
import { recordTrip } from "../lib/recentTrips"

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "THB", "SGD"]

export function CreateGroup() {
  const navigate = useNavigate()
  const [title, setTitle] = useState("")
  const [baseCurrency, setBaseCurrency] = useState("USD")
  const [memberNames, setMemberNames] = useState<string[]>(["", ""])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const setName = (index: number, value: string) =>
    setMemberNames((prev) => prev.map((n, i) => (i === index ? value : n)))

  const addRow = () => setMemberNames((prev) => [...prev, ""])

  // A group needs at least two members, so keep two rows as the floor; any
  // extra (e.g. an accidental "Add member") can always be removed.
  const removeRow = (index: number) =>
    setMemberNames((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== index)))

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const names = memberNames.map((n) => n.trim()).filter((n) => n !== "")
    if (title.trim() === "" || names.length < 2) {
      setError("Add a title and at least two members.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const state = await createGroup({
        title: title.trim(),
        baseCurrency,
        rounding: 1, // settle-up is exact by default; cash-rounding is an in-trip option
        memberNames: names,
      })
      recordTrip({
        slug: state.group.slug,
        title: state.group.title,
        baseCurrency: state.group.baseCurrency,
        rounding: state.group.rounding,
      })
      navigate(`/g/${state.group.slug}`)
    } catch {
      setError("Could not create the group. Try again.")
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} aria-label="Create group" className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
          Split anything on a trip. End up all square.
        </h1>
        <p className="text-sm text-muted-foreground">
          No sign-up. Any currency. Share one link — everyone adds what they paid, and Allsquare
          works out who owes who.
        </p>
      </div>

      <Card>
        <CardContent className="gap-4 pt-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="trip-title">Trip title</Label>
            <Input
              id="trip-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Kyoto trip, Tahoe weekend…"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="base-currency">Base currency</Label>
            <select
              id="base-currency"
              value={baseCurrency}
              onChange={(e) => setBaseCurrency(e.target.value)}
              className="flex h-11 w-full rounded-md border border-input bg-card px-3 text-base text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <fieldset className="flex flex-col gap-3 rounded-md border border-border p-4">
            <legend className="px-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Members
            </legend>
            {memberNames.map((name, i) => (
              <div
                className="flex items-center gap-2"
                // biome-ignore lint/suspicious/noArrayIndexKey: member rows are positional
                key={i}
              >
                <Input
                  aria-label={`Member ${i + 1}`}
                  value={name}
                  onChange={(e) => setName(i, e.target.value)}
                  placeholder="Name"
                  className="flex-1"
                />
                {memberNames.length > 2 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove member ${i + 1}`}
                    onClick={() => removeRow(i)}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRow}
              className="self-start"
            >
              Add member
            </Button>
          </fieldset>
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={submitting} className="w-full">
            Create group
          </Button>
        </CardContent>
      </Card>
    </form>
  )
}
