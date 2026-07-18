import { Button, Card, CardContent } from "@allsquare/ui"
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

  return (
    <section aria-label="Share">
      <Card className="w-fit">
        <CardContent className="items-center pt-3.5">
          <Button type="button" variant="secondary" onClick={copy}>
            {copied ? "Copied!" : "Copy link"}
          </Button>
          <QrCode value={url} />
        </CardContent>
      </Card>
    </section>
  )
}
