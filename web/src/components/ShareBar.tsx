import { Button } from "@allsquare/ui"
import { useState } from "react"
import { QrCode } from "./QrCode"

export function ShareBar({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  // Bare column (no Card) so it sits flat inside the share dialog.
  return (
    <section aria-label="Share" className="flex flex-col items-center gap-3">
      <Button type="button" variant="secondary" onClick={copy} className="w-full">
        {copied ? "Copied!" : "Copy link"}
      </Button>
      <QrCode value={url} />
    </section>
  )
}
