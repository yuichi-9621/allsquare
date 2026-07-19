import { Button, Card, CardContent, Input, Label } from "@allsquare/ui"
import { type FormEvent, useState } from "react"
import { useNavigate } from "react-router-dom"
import { createGroup } from "../lib/api"
import { useT } from "../lib/i18n"
import { usePageMeta } from "../lib/pageMeta"
import { recordTrip } from "../lib/recentTrips"

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "THB", "SGD"]

export function CreateGroup() {
  const t = useT()
  usePageMeta({ title: t("createGroupMetaTitle") })
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
      setError(t("titleMembersRequired"))
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
      setError(t("createGroupError"))
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      aria-label={t("createGroup")}
      className="mx-auto flex w-full max-w-lg flex-col gap-6"
    >
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
          {t("createGroupHeroTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("createGroupHeroDesc")}</p>
      </div>

      <Card>
        <CardContent className="gap-4 pt-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="trip-title">{t("tripTitle")}</Label>
            <Input
              id="trip-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("tripTitlePlaceholder")}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="base-currency">{t("baseCurrency")}</Label>
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
              {t("members")}
            </legend>
            {memberNames.map((name, i) => (
              <div
                className="flex items-center gap-2"
                // biome-ignore lint/suspicious/noArrayIndexKey: member rows are positional
                key={i}
              >
                <Input
                  aria-label={t("memberN", { n: i + 1 })}
                  value={name}
                  onChange={(e) => setName(i, e.target.value)}
                  placeholder={t("namePlaceholder")}
                  className="flex-1"
                />
                {memberNames.length > 2 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={t("removeMemberN", { n: i + 1 })}
                    onClick={() => removeRow(i)}
                  >
                    {t("remove")}
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
              {t("addMemberRow")}
            </Button>
          </fieldset>
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={submitting} className="w-full">
            {t("createGroup")}
          </Button>
        </CardContent>
      </Card>
    </form>
  )
}
