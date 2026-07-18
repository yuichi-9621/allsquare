import type { Meta, StoryObj } from "@storybook/react"
import { Stamp } from "./stamp"

const meta: Meta<typeof Stamp> = { title: "UI/Stamp", component: Stamp }
export default meta
type Story = StoryObj<typeof Stamp>

export const Pending: Story = { args: { state: "pending" } }
export const Square: Story = { args: { state: "square" } }
