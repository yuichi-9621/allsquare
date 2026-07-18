import type { Meta, StoryObj } from "@storybook/react"
import { Card, CardContent, CardHeader, CardTitle } from "./card"

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
}
export default meta
type Story = StoryObj<typeof Card>

export const Default: Story = {
  render: () => (
    <div className="bg-cover-background p-8">
      <Card>
        <CardHeader>
          <CardTitle>Bill Split</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Total: $120.50</p>
          <p>Your share: $40.17</p>
        </CardContent>
      </Card>
    </div>
  ),
}
