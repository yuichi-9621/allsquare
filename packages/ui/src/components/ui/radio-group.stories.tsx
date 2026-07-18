import type { Meta, StoryObj } from "@storybook/react"
import { RadioGroup, RadioGroupItem } from "./radio-group"

const meta: Meta<typeof RadioGroup> = { title: "UI/RadioGroup", component: RadioGroup }
export default meta
type Story = StoryObj<typeof RadioGroup>

export const Default: Story = {
  render: () => (
    <RadioGroup defaultValue="equal">
      <RadioGroupItem value="equal" aria-label="Equal split" />
      <RadioGroupItem value="exact" aria-label="Exact amounts" />
      <RadioGroupItem value="percentage" aria-label="Percentage split" />
    </RadioGroup>
  ),
}

export const Selected: Story = {
  render: () => (
    <RadioGroup defaultValue="exact">
      <RadioGroupItem value="equal" aria-label="Equal split" />
      <RadioGroupItem value="exact" aria-label="Exact amounts" />
      <RadioGroupItem value="percentage" aria-label="Percentage split" />
    </RadioGroup>
  ),
}
