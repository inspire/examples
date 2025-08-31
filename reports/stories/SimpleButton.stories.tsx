import type { Meta, StoryObj } from '@storybook/react'

const SimpleButton = ({ children }: { children: React.ReactNode }) => (
  <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
    {children}
  </button>
)

const meta = {
  title: 'Test/SimpleButton',
  component: SimpleButton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SimpleButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: 'Simple Button',
  },
}