import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const meta = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Payment Batch</CardTitle>
        <CardDescription>Batch details and transaction summary</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Total Amount:</span>
            <span className="font-semibold">$1,234.56</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Transactions:</span>
            <span className="font-semibold">45</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge variant="secondary">Settled</Badge>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">Details</Button>
        <Button>Export</Button>
      </CardFooter>
    </Card>
  ),
}

export const WithGradient: Story = {
  render: () => (
    <Card className="w-[350px] backdrop-blur-sm bg-card/95 border-slate-200/50 dark:border-slate-700/50 shadow-xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Premium Card
          </CardTitle>
          <Badge className="animate-pulse">Live</Badge>
        </div>
        <CardDescription>Enhanced card with gradient styling</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm">Real-time Processing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-sm">API Connected</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
        >
          Get Started
        </Button>
      </CardFooter>
    </Card>
  ),
}

export const Simple: Story = {
  render: () => (
    <Card className="w-[300px]">
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">
          This is a simple card with just content, no header or footer.
        </p>
      </CardContent>
    </Card>
  ),
}