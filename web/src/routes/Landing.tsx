import { Button, Card, CardContent, Stamp } from "@allsquare/ui"
import { Link } from "react-router-dom"

// Use cases rendered as passport stamps — the identity's signature, doing the
// walica "こんなシーンで" job. Inks alternate between the two decorative tones
// (foil caramel / olive secondary); copper stays reserved for the CTAs.
const USE_CASES = [
  {
    stamp: "Trip abroad",
    ink: "border-foil text-foil",
    tilt: "-rotate-2",
    desc: "Yen in Tokyo, euros in Paris — everyone still settles in one currency.",
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
    desc: "Gas, tolls, snacks, the motel — add them as they happen.",
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
    desc: "No sign-up, nothing to install. The link is the invite — anyone who opens it is in.",
  },
  {
    title: "Everyone adds what they paid",
    desc: "In any currency. Each expense freezes that day's rate, so totals never shift under you.",
  },
  {
    title: "Settle with the fewest payments",
    desc: "Allsquare works out who pays who — once. Mark payments as they land, and the stamp drops.",
  },
]

export function Landing() {
  return (
    <main className="flex w-full flex-col gap-10 pb-6">
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
        <Button asChild size="lg" className="w-full">
          <Link to="/new">Start a group</Link>
        </Button>
        <p className="font-mono text-[0.62rem] uppercase tracking-wider text-muted-foreground">
          Free · no accounts · works offline
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
        <ol className="flex flex-col gap-5">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3.5">
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

      {/* Closing — the promise, stamped. */}
      <section className="flex flex-col items-center gap-4 text-center">
        <Stamp state="square" className="scale-150" />
        <p className="text-muted-foreground">Every group ends the same way.</p>
        <Button asChild size="lg" className="w-full">
          <Link to="/new">Start a group — it's free</Link>
        </Button>
      </section>
    </main>
  )
}
