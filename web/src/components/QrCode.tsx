import qrcode from "qrcode-generator"
import type { ReactElement } from "react"

export function QrCode({ value, size = 160 }: { value: string; size?: number }) {
  const qr = qrcode(0, "M") // type 0 = auto-size, "M" = medium error correction
  qr.addData(value)
  qr.make()
  const count = qr.getModuleCount()

  const rects: ReactElement[] = []
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) {
        rects.push(<rect key={`${row}-${col}`} x={col} y={row} width={1} height={1} />)
      }
    }
  }

  return (
    <svg
      role="img"
      aria-label="Group QR code"
      width={size}
      height={size}
      viewBox={`0 0 ${count} ${count}`}
      shapeRendering="crispEdges"
    >
      <rect x={0} y={0} width={count} height={count} fill="#ffffff" />
      <g fill="#000000">{rects}</g>
    </svg>
  )
}
