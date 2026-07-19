import { Button } from "@allsquare/ui"
import { useT } from "../lib/i18n"
import { useState } from "react"
import { QrCode } from "./QrCode"

export function ShareBar({ url }: { url: string }) {
  const t = useT()
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
        {copied ? t("copied") : t("copyLink")}
      </Button>
      <QrCode value={url} />
    </section>
  )
}
