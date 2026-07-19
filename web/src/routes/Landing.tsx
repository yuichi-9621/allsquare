import { Button, Card, CardContent, Stamp } from "@allsquare/ui"
import { Link } from "react-router-dom"
import { DEFAULT_META, usePageMeta } from "../lib/pageMeta"

// Use cases rendered as passport stamps — the identity's signature, doing the
// walica "こんなシーンで" job. Inks alternate between the two decorative tones
// (foil caramel / olive secondary); copper stays reserved for the CTAs.
const USE_CASES = [
  {
    stamp: "Trip abroad",
    ink: "border-foil text-foil",
    tilt: "-rotate-2",
    desc: "Yen in Tokyo, euros in Paris. Everyone still settles in one currency.",
  },
  {
    stamp: "Group dinner",
    ink: "border-secondary text-secondary",
    tilt: "rotate-1",
    desc: "One card takes the hit tonight. Square it before anyone forgets.",
  },
  {
    stamp: "Road trip",
    ink: "border-secondary text-secondary",
    tilt: "rotate-2",
    desc: "Gas, tolls, snacks, the motel. Add them as they happen.",
  },
  {
    stamp: "Shared house",
    ink: "border-foil text-foil",
    tilt: "-rotate-1",
    desc: "Rent, groceries, utilities: one running tab for the household.",
  },
]

const STEPS = [
  {
    title: "Start a group, share one link",
    desc: "No sign-up, nothing to install. The link is the invite, and anyone who opens it is in.",
  },
  {
    title: "Everyone adds what they paid",
    desc: "In any currency. Each expense freezes that day's rate, so totals never shift under you.",
  },
  {
    title: "Settle with the fewest payments",
    desc: "Allsquare works out who pays who, in as few payments as possible. Mark them paid and the stamp drops.",
  },
]

// Kept word-for-word in sync with the FAQPage JSON-LD in index.html; Google
// requires the schema answers to match visible page content.
const FAQS = [
  {
    q: "Do I need an account to use Allsquare?",
    a: "No. Start a group, share the link, and everyone is in. Nobody signs up, ever.",
  },
  {
    q: "Do my friends need to install anything?",
    a: "No. The link opens in any browser, on any phone or laptop. Allsquare can also be added to the home screen like an app.",
  },
  {
    q: "How does multi-currency splitting work?",
    a: "Add each expense in the currency you paid in. Allsquare locks that day's exchange rate, and everyone settles in the group's home currency.",
  },
  {
    q: "How is Allsquare different from Splitwise?",
    a: "There are no accounts and nothing to install. Start a group, share the link, and everyone is in within seconds.",
  },
]

export function Landing() {
  usePageMeta(DEFAULT_META)
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-10 pb-6">
      {/* Hero — the thesis, on the dark cover surface. */}
      <section className="flex flex-col gap-4 pt-2">
        <h1 className="font-display text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
          Split anything.
          <br />
          End up all square.
        </h1>
        <p className="text-muted-foreground">
          The no-sign-up bill splitter for trips, dinners, and everything your group shares. Any
          currency, one shared link.
        </p>
        <Button asChild size="lg" className="w-full sm:w-fit sm:px-10">
          <Link to="/new">Start a group</Link>
        </Button>
        <p className="font-mono text-[0.62rem] uppercase tracking-wider text-muted-foreground">
          No accounts · no cookies · any currency · works offline
        </p>
      </section>

      {/* Use cases — a passport page of stamps. */}
      <section aria-label="Use cases" className="flex flex-col gap-3">
        <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Made for moments like
        </h2>
        <Card>
          <CardContent className="grid grid-cols-1 gap-x-5 gap-y-6 pt-4 sm:grid-cols-2">
            {USE_CASES.map((u) => (
              <div key={u.stamp} className="flex flex-col gap-2">
                <span
                  className={`w-fit rounded border-2 px-2 py-0.5 font-mono text-[0.7rem] font-bold uppercase tracking-widest ${u.tilt} ${u.ink}`}
                >
                  {u.stamp}
                </span>
                <p className="text-sm text-muted-foreground">{u.desc}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* How it works — a real sequence, so the numbers carry information. */}
      <section aria-label="How it works" className="flex flex-col gap-4">
        <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          How it works
        </h2>
        <ol className="flex flex-col gap-5 md:grid md:grid-cols-3 md:gap-6">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3.5 md:flex-col">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-foil/60 font-mono text-sm text-foil">
                {i + 1}
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="font-semibold text-foreground">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* FAQ — visible twin of the FAQPage structured data. */}
      <section aria-label="Frequently asked questions" className="flex flex-col gap-4">
        <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Questions, answered
        </h2>
        <dl className="flex flex-col gap-5">
          {FAQS.map((f) => (
            <div key={f.q} className="flex flex-col gap-1">
              <dt className="font-semibold text-foreground">{f.q}</dt>
              <dd className="text-sm text-muted-foreground">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Closing — the promise, stamped. */}
      <section className="flex flex-col items-center gap-4 text-center">
        <Stamp state="square" className="scale-150" />
        <p className="text-muted-foreground">Every group ends the same way.</p>
        <Button asChild size="lg" className="w-full sm:w-fit sm:px-10">
          <Link to="/new">Start a group now</Link>
        </Button>
        <p className="text-xs text-muted-foreground">
          No cookies, no tracking. Your trip list stays on your device.
        </p>
      </section>
    </main>
  )
}
