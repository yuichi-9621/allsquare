import { Button, Card, CardContent, Stamp } from "@allsquare/ui"
import { Link } from "react-router-dom"
import { t, useLocale } from "../lib/i18n"
import type { MessageKey } from "../lib/i18n"
import { usePageMeta } from "../lib/pageMeta"

// Use cases rendered as passport stamps — the identity's signature, doing the
// walica "こんなシーンで" job. Inks alternate between the two decorative tones
// (foil caramel / olive secondary); copper stays reserved for the CTAs.
const USE_CASES: { stampKey: MessageKey; descKey: MessageKey; ink: string; tilt: string }[] = [
  {
    stampKey: "useCaseTripAbroad",
    descKey: "useCaseTripAbroadDesc",
    ink: "border-foil text-foil",
    tilt: "-rotate-2",
  },
  {
    stampKey: "useCaseGroupDinner",
    descKey: "useCaseGroupDinnerDesc",
    ink: "border-secondary text-secondary",
    tilt: "rotate-1",
  },
  {
    stampKey: "useCaseRoadTrip",
    descKey: "useCaseRoadTripDesc",
    ink: "border-secondary text-secondary",
    tilt: "rotate-2",
  },
  {
    stampKey: "useCaseSharedHouse",
    descKey: "useCaseSharedHouseDesc",
    ink: "border-foil text-foil",
    tilt: "-rotate-1",
  },
]

const STEPS: { titleKey: MessageKey; descKey: MessageKey }[] = [
  { titleKey: "step1Title", descKey: "step1Desc" },
  { titleKey: "step2Title", descKey: "step2Desc" },
  { titleKey: "step3Title", descKey: "step3Desc" },
]

// Kept word-for-word in sync with the FAQPage JSON-LD in index.html; Google
// requires the schema answers to match visible page content. JSON-LD stays
// English regardless of locale (no /ja routes yet), so this diverges from
// the visible copy once the ja dictionary is active — that's expected.
const FAQS: { qKey: MessageKey; aKey: MessageKey }[] = [
  { qKey: "faqAccountQ", aKey: "faqAccountA" },
  { qKey: "faqInstallQ", aKey: "faqInstallA" },
  { qKey: "faqCurrencyQ", aKey: "faqCurrencyA" },
  { qKey: "faqSplitwiseQ", aKey: "faqSplitwiseA" },
]

export function Landing() {
  // Subscribes to locale changes (so this route re-renders when the
  // switcher below, or the trip menu elsewhere, flips the language) and
  // exposes the setter for the footer toggle.
  const [locale, setLocale] = useLocale()
  usePageMeta({ title: t("metaTitle"), description: t("metaDescription") })
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-10 pb-6">
      {/* Hero — the thesis, on the dark cover surface. */}
      <section className="flex flex-col gap-4 pt-2">
        <h1 className="font-display text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
          {t("heroLine1")}
          <br />
          {t("heroLine2")}
        </h1>
        <p className="text-muted-foreground">{t("heroSubtitle")}</p>
        <Button asChild size="lg" className="w-full sm:w-fit sm:px-10">
          <Link to="/new">{t("startGroup")}</Link>
        </Button>
        <p className="font-mono text-[0.62rem] uppercase tracking-wider text-muted-foreground">
          {t("heroFeatures")}
        </p>
      </section>

      {/* Use cases — a passport page of stamps. */}
      <section aria-label="Use cases" className="flex flex-col gap-3">
        <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {t("madeForMoments")}
        </h2>
        <Card>
          <CardContent className="grid grid-cols-1 gap-x-5 gap-y-6 pt-4 sm:grid-cols-2">
            {USE_CASES.map((u) => (
              <div key={u.stampKey} className="flex flex-col gap-2">
                <span
                  className={`w-fit rounded border-2 px-2 py-0.5 font-mono text-[0.7rem] font-bold uppercase tracking-widest ${u.tilt} ${u.ink}`}
                >
                  {t(u.stampKey)}
                </span>
                <p className="text-sm text-muted-foreground">{t(u.descKey)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* How it works — a real sequence, so the numbers carry information. */}
      <section aria-label="How it works" className="flex flex-col gap-4">
        <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {t("howItWorks")}
        </h2>
        <ol className="flex flex-col gap-5 md:grid md:grid-cols-3 md:gap-6">
          {STEPS.map((s, i) => (
            <li key={s.titleKey} className="flex gap-3.5 md:flex-col">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-foil/60 font-mono text-sm text-foil">
                {i + 1}
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="font-semibold text-foreground">{t(s.titleKey)}</h3>
                <p className="text-sm text-muted-foreground">{t(s.descKey)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* FAQ — visible twin of the FAQPage structured data. */}
      <section aria-label="Frequently asked questions" className="flex flex-col gap-4">
        <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {t("questionsAnswered")}
        </h2>
        <dl className="flex flex-col gap-5">
          {FAQS.map((f) => (
            <div key={f.qKey} className="flex flex-col gap-1">
              <dt className="font-semibold text-foreground">{t(f.qKey)}</dt>
              <dd className="text-sm text-muted-foreground">{t(f.aKey)}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Closing — the promise, stamped. */}
      <section className="flex flex-col items-center gap-4 text-center">
        <Stamp
          state="square"
          className="scale-150"
          labels={{ square: t("allSquareStamp"), pending: t("notYetSquareStamp") }}
        />
        <p className="text-muted-foreground">{t("everyGroupEndsSame")}</p>
        <Button asChild size="lg" className="w-full sm:w-fit sm:px-10">
          <Link to="/new">{t("startGroupNow")}</Link>
        </Button>
        <p className="text-xs text-muted-foreground">{t("privacyPromise")}</p>
        <div className="flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-wider text-muted-foreground">
          <button
            type="button"
            onClick={() => setLocale("en")}
            aria-pressed={locale === "en"}
            className={locale === "en" ? "text-foreground underline" : "hover:underline"}
          >
            English
          </button>
          <span aria-hidden>·</span>
          <button
            type="button"
            onClick={() => setLocale("ja")}
            aria-pressed={locale === "ja"}
            className={locale === "ja" ? "text-foreground underline" : "hover:underline"}
          >
            日本語
          </button>
        </div>
      </section>
    </main>
  )
}
