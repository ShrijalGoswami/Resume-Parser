'use client'

import * as React from 'react'
import { Plus, Search, Sparkles, Users, FileWarning } from 'lucide-react'
import { AppShell } from '@/components/hirelens/shell'
import {
  Button,
  Input,
  Textarea,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Avatar,
  Divider,
  Skeleton,
  Spinner,
  Kbd,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerTitle,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  toast,
} from '@/components/hirelens/ui'
import {
  EmptyState,
  ErrorState,
  GateState,
} from '@/components/hirelens/states'

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-4 border-b border-hl-border-subtle py-8">
      <div>
        <h2 className="hl-h2">{title}</h2>
        {description ? (
          <p className="hl-small mt-1 text-hl-fg-secondary">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}

function Swatch({ label, className }: { label: string; className: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className={`h-12 rounded-hl-md border border-hl-border ${className}`} />
      <span className="hl-caption text-hl-fg-tertiary">{label}</span>
    </div>
  )
}

export default function FoundationsPage() {
  return (
    <AppShell
      title="Foundations"
      account={{ name: 'Alex Rivera', email: 'alex@acme.co' }}
    >
      <div className="mx-auto w-full max-w-5xl px-6 pb-24">
        <header className="py-8">
          <p className="hl-caption text-hl-accent-fg">HireLens V3 · P0</p>
          <h1 className="hl-display mt-1">Design system foundations</h1>
          <p className="hl-body mt-2 max-w-xl text-hl-fg-secondary">
            A living reference for every P0 primitive, state, and token. Toggle
            theme and density from the account menu to verify both modes.
          </p>
        </header>

        <Section title="Typography" description="Fraunces display · Inter UI · JetBrains mono">
          <div className="flex flex-col gap-1">
            <p className="hl-display-xl">Display XL</p>
            <p className="hl-display">Display</p>
            <p className="hl-h1">Heading 1</p>
            <p className="hl-h2">Heading 2</p>
            <p className="hl-h3">Heading 3</p>
            <p className="hl-body">Body — the default reading size.</p>
            <p className="hl-small text-hl-fg-secondary">Small secondary text.</p>
            <p className="hl-caption text-hl-fg-tertiary">CAPTION · META</p>
            <p className="hl-mono">mono 88.4 · REQ-2f9a</p>
          </div>
        </Section>

        <Section title="Color" description="Semantic tokens; values resolve per theme">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            <Swatch label="canvas" className="bg-hl-canvas" />
            <Swatch label="subtle" className="bg-hl-subtle" />
            <Swatch label="muted" className="bg-hl-muted" />
            <Swatch label="inset" className="bg-hl-inset" />
            <Swatch label="accent" className="bg-hl-accent" />
            <Swatch label="accent-subtle" className="bg-hl-accent-subtle" />
            <Swatch label="ai-surface" className="bg-hl-ai-surface" />
            <Swatch label="in focus" className="bg-hl-score-infocus" />
            <Swatch label="sharp" className="bg-hl-score-sharp" />
            <Swatch label="legible" className="bg-hl-score-legible" />
            <Swatch label="soft" className="bg-hl-score-soft" />
            <Swatch label="out of focus" className="bg-hl-score-outfocus" />
            <Swatch label="success" className="bg-hl-success" />
            <Swatch label="warning" className="bg-hl-warning" />
            <Swatch label="danger" className="bg-hl-danger" />
            <Swatch label="info" className="bg-hl-info" />
          </div>
        </Section>

        <Section title="Buttons">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="ai">
              <Sparkles /> Ask AI
            </Button>
            <Button variant="primary" loading>
              Saving
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" size="sm">
              Small
            </Button>
            <Button variant="primary" size="md">
              Medium
            </Button>
            <Button variant="primary" size="lg">
              Large
            </Button>
            <Button variant="secondary" size="icon" aria-label="Add">
              <Plus />
            </Button>
          </div>
        </Section>

        <Section title="Inputs">
          <div className="grid max-w-md gap-3">
            <Input placeholder="Default input" />
            <Input variant="error" defaultValue="Invalid value" />
            <Textarea placeholder="Multiline textarea" />
          </div>
        </Section>

        <Section title="Badges & avatars">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Neutral</Badge>
            <Badge variant="accent">Accent</Badge>
            <Badge variant="success">Open</Badge>
            <Badge variant="warning">At risk</Badge>
            <Badge variant="danger">Closed</Badge>
            <Badge variant="info">Info</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Avatar name="Aarav Sharma" />
            <Avatar name="Sneha Rao" size={32} />
            <Avatar name="Priya Menon" size={40} />
          </div>
        </Section>

        <Section title="Cards">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Default card</CardTitle>
                <CardDescription>Resting surface with a hairline border.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="hl-small text-hl-fg-secondary">Content region.</p>
              </CardContent>
            </Card>
            <Card variant="interactive">
              <CardHeader>
                <CardTitle>Interactive</CardTitle>
                <CardDescription>Lifts on hover.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="hl-small text-hl-fg-secondary">Whole card is a target.</p>
              </CardContent>
            </Card>
            <Card variant="ai">
              <CardHeader>
                <CardTitle>
                  <span className="inline-flex items-center gap-1.5">
                    <Sparkles className="size-4 text-hl-prism-mid" /> AI surface
                  </span>
                </CardTitle>
                <CardDescription>Prism gradient border over the AI surface.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="hl-small text-hl-fg-secondary">Used by AIAnswer and approvals.</p>
              </CardContent>
            </Card>
            <Card variant="approval">
              <CardHeader>
                <CardTitle>Approval</CardTitle>
                <CardDescription>Same treatment; decision object.</CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button variant="primary" size="sm">
                  Approve
                </Button>
                <Button variant="ghost" size="sm">
                  Dismiss
                </Button>
              </CardContent>
            </Card>
          </div>
        </Section>

        <Section title="Feedback">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex w-64 flex-col gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Spinner className="size-6 text-hl-accent" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="secondary">Hover for tooltip</Button>
              </TooltipTrigger>
              <TooltipContent>Tooltips appear after 500ms</TooltipContent>
            </Tooltip>
            <span className="inline-flex items-center gap-1.5 hl-small text-hl-fg-secondary">
              Press <Kbd>⌘</Kbd> <Kbd>K</Kbd>
            </span>
          </div>
        </Section>

        <Section title="Overlays">
          <div className="flex flex-wrap items-center gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary">Open dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete workspace</DialogTitle>
                  <DialogDescription>
                    This removes the workspace and its data. This cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="ghost">Cancel</Button>
                  </DialogClose>
                  <Button variant="danger">Delete workspace</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Drawer>
              <DrawerTrigger asChild>
                <Button variant="secondary">Open drawer (rack focus)</Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <div>
                    <DrawerTitle>Aarav Sharma</DrawerTitle>
                    <p className="hl-small text-hl-fg-secondary">Senior Backend Engineer</p>
                  </div>
                </DrawerHeader>
                <DrawerBody>
                  <p className="hl-body text-hl-fg-secondary">
                    The surface behind dims, desaturates, and blurs while this
                    panel resolves sharp.
                  </p>
                </DrawerBody>
              </DrawerContent>
            </Drawer>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary">Open menu</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Compare</DropdownMenuItem>
                <DropdownMenuItem>Add to role</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Reject</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Section>

        <Section title="Tabs">
          <Tabs defaultValue="pipeline">
            <TabsList variant="segmented">
              <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="forecast">Forecast</TabsTrigger>
            </TabsList>
            <TabsContent value="pipeline" className="pt-3 hl-small text-hl-fg-secondary">
              Segmented is the LensSwitcher style.
            </TabsContent>
            <TabsContent value="analytics" className="pt-3 hl-small text-hl-fg-secondary">
              Analytics content.
            </TabsContent>
            <TabsContent value="forecast" className="pt-3 hl-small text-hl-fg-secondary">
              Forecast content.
            </TabsContent>
          </Tabs>
        </Section>

        <Section title="Toasts">
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={() => toast({ variant: 'success', title: 'Shortlisted 5 candidates' })}
            >
              Success
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                toast({
                  variant: 'info',
                  title: 'Moved to Interview',
                  action: { label: 'Undo', onClick: () => toast({ title: 'Reverted' }) },
                })
              }
            >
              With undo
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                toast({ variant: 'danger', title: "Couldn't reach the server", description: 'Try again in a moment.' })
              }
            >
              Danger
            </Button>
          </div>
        </Section>

        <Section title="States">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <EmptyState
                variant="first-run"
                icon={Users}
                title="Let's fill your first role"
                description="Create a role to start evaluating candidates."
                action={
                  <Button variant="primary">
                    <Plus /> Create a role
                  </Button>
                }
              />
            </Card>
            <Card>
              <EmptyState
                variant="zero-results"
                icon={Search}
                title="No matches"
                description="Try broadening your filters."
                action={<Button variant="secondary">Clear filters</Button>}
              />
            </Card>
            <Card className="p-4">
              <ErrorState
                variant="inline"
                title="Analytics didn't load"
                description="The metrics service is unavailable."
                onRetry={() => toast({ title: 'Retrying…' })}
              />
            </Card>
            <Card className="p-4">
              <GateState
                reason="plan"
                title="Executive Reports is available on the Growth plan."
                action={<Button variant="primary">Upgrade</Button>}
              />
            </Card>
            <Card className="p-4">
              <GateState
                reason="permission"
                icon={FileWarning}
                title="You need Recruiter access to view this."
                action={<Button variant="secondary">Request access</Button>}
              />
            </Card>
          </div>
        </Section>
      </div>
    </AppShell>
  )
}
