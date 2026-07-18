import type { Meta, StoryObj } from "@storybook/react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"

const meta: Meta<typeof Select> = {
  title: "UI/Select",
  component: Select,
}
export default meta
type Story = StoryObj<typeof Select>

export const Currency: Story = {
  render: () => (
    <Select defaultValue="USD">
      <SelectTrigger aria-label="Currency" className="w-40">
        <SelectValue placeholder="USD" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="USD">USD</SelectItem>
        <SelectItem value="EUR">EUR</SelectItem>
        <SelectItem value="GBP">GBP</SelectItem>
        <SelectItem value="JPY">JPY</SelectItem>
      </SelectContent>
    </Select>
  ),
}
