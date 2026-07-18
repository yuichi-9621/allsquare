import type { Meta, StoryObj } from "@storybook/react"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"

const meta: Meta<typeof Popover> = { title: "UI/Popover", component: Popover }
export default meta
type Story = StoryObj<typeof Popover>

export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger aria-label="Trip menu">⋮</PopoverTrigger>
      <PopoverContent>
        <div className="flex flex-col gap-2">
          <button type="button" className="text-left text-sm hover:underline">
            Rename trip
          </button>
          <button type="button" className="text-left text-sm hover:underline">
            Delete trip
          </button>
        </div>
      </PopoverContent>
    </Popover>
  ),
}
