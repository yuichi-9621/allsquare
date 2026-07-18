import type { Meta, StoryObj } from "@storybook/react"
import { Button } from "./button"

const meta: Meta<typeof Button> = { title: "UI/Button", component: Button }
export default meta
type Story = StoryObj<typeof Button>

export const Primary: Story = { args: { children: "Add expense" } }
export const Secondary: Story = { args: { variant: "secondary", children: "Add member" } }
export const Outline: Story = { args: { variant: "outline", children: "Cancel" } }
export const Ghost: Story = { args: { variant: "ghost", children: "Edit" } }
