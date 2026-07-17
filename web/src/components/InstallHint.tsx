import { useEffect, useState } from "react"

type InstallEvent = Event & { prompt: () => Promise<void> }

export function InstallHint() {
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
      onClick={() => {
        void deferred.prompt()
        setDeferred(null)
      }}
    >
      Add Allsquare to your home screen
    </button>
  )
}
