import type { Preview } from "@storybook/react"
import "../src/styles/index.css"

const preview: Preview = {
  parameters: {
    backgrounds: { default: "cover", values: [{ name: "cover", value: "#7BA05B" }] },
    layout: "centered",
  },
}
export default preview
