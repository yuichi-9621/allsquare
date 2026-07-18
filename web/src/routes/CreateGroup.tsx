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
    <form onSubmit={onSubmit} aria-label="Create group">
      <div className="hero">
        <h1>Split anything on a trip. End up all square.</h1>
        <p className="hero-sub">
          No sign-up. Any currency. Share one link — everyone adds what they paid, and Allsquare
          works out who owes who.
        </p>
      </div>
      <label>
        Trip title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Kyoto trip, Tahoe weekend…"
        />
      </label>
      <label>
        Base currency
        <select value={baseCurrency} onChange={(e) => setBaseCurrency(e.target.value)}>
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend>Members</legend>
        {memberNames.map((name, i) => (
          <div
            className="member-row"
            // biome-ignore lint/suspicious/noArrayIndexKey: member rows are positional
            key={i}
          >
            <input
              aria-label={`Member ${i + 1}`}
              value={name}
              onChange={(e) => setName(i, e.target.value)}
              placeholder="Name"
            />
            {memberNames.length > 2 ? (
              <button
                type="button"
                className="row-remove"
                aria-label={`Remove member ${i + 1}`}
                onClick={() => removeRow(i)}
              >
                Remove
              </button>
            ) : null}
          </div>
        ))}
        <button type="button" onClick={addRow}>
          Add member
        </button>
      </fieldset>
      {error ? <p role="alert">{error}</p> : null}
      <button type="submit" disabled={submitting}>
        Create group
      </button>
    </form>
  )
}
