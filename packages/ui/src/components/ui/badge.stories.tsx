import type { Meta, StoryObj } from "@storybook/react"
import { Badge } from "./badge"

const meta: Meta<typeof Badge> = {
  title: "UI/Badge",
  component: Badge,
}
export default meta
type Story = StoryObj<typeof Badge>

export const Foil: Story = {
  args: { children: "foil", variant: "foil" },
}

export const Success: Story = {
  args: { children: "success", variant: "success" },
}

export const Danger: Story = {
  args: { children: "danger", variant: "danger" },
}

export const Muted: Story = {
  args: { children: "muted", variant: "muted" },
}
