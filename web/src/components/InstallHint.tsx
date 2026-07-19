import { useEffect, useState } from "react"
import { useT } from "../lib/i18n"

type InstallEvent = Event & { prompt: () => Promise<void> }

export function InstallHint() {
  const t = useT()
  const [deferred, setDeferred] = useState<InstallEvent | null>(null)

  useEffect(() => {
    const onPrompt = (event: Event) => {
      // Suppress the default mini-infobar; surface our own affordance instead.
      event.preventDefault()
      setDeferred(event as InstallEvent)
    }
    window.addEventListener("beforeinstallprompt", onPrompt)
    return () => window.removeEventListener("beforeinstallprompt", onPrompt)
  }, [])

  if (deferred === null) return null
  return (
    <button
      type="button"
      className="rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
      onClick={() => {
        void deferred.prompt()
        setDeferred(null)
      }}
    >
      {t("addToHomeScreen")}
    </button>
  )
}
