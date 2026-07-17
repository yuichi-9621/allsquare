import { type FormEvent, useState } from "react"
import { useNavigate } from "react-router-dom"
import { createGroup } from "../lib/api"
import type { Rounding } from "../lib/types"

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "THB", "SGD"]
const ROUNDINGS: Rounding[] = [1, 10, 100, 1000]

export function CreateGroup() {
  const navigate = useNavigate()
  const [title, setTitle] = useState("")
  const [baseCurrency, setBaseCurrency] = useState("USD")
  const [rounding, setRounding] = useState<Rounding>(1)
  const [memberNames, setMemberNames] = useState<string[]>(["", ""])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const setName = (index: number, value: string) =>
    setMemberNames((prev) => prev.map((n, i) => (i === index ? value : n)))

  const addRow = () => setMemberNames((prev) => [...prev, ""])

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
        rounding,
        memberNames: names,
      })
      navigate(`/g/${state.group.slug}`)
    } catch {
      setError("Could not create the group. Try again.")
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} aria-label="Create group">
      <h1>Start a group</h1>
      <label>
        Trip title
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
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
      <label>
        Rounding
        <select value={rounding} onChange={(e) => setRounding(Number(e.target.value) as Rounding)}>
          {ROUNDINGS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend>Members</legend>
        {memberNames.map((name, i) => (
          <input
            // biome-ignore lint/suspicious/noArrayIndexKey: member rows are positional
            key={i}
            aria-label={`Member ${i + 1}`}
            value={name}
            onChange={(e) => setName(i, e.target.value)}
          />
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
