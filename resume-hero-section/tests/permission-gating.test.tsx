// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

/**
 * Frontend RBAC — the UI must offer exactly the actions the server will accept.
 *
 * The server is the authority and answers 403 regardless of what rendered; these
 * assertions are about not *offering* an action that is going to fail. They are
 * written per role against `ROLE_PERMISSIONS` (see
 * docs/security/PERMISSION_MATRIX.md) rather than per component, because the
 * question worth regression-testing is "what can a viewer do?", not "does this
 * button call useCan".
 *
 * `useOrgContext` is mocked rather than `useCan`, so the real gate logic runs.
 */
const permissions = vi.hoisted(() => ({ current: [] as string[] }))
const ctxState = vi.hoisted(() => ({ current: 'ready' as 'ready' | 'loading' | 'error' }))

vi.mock('../components/hirelens/lib/api/org-context', () => ({
  orgContextKey: ['hl', 'settings', 'org-context'],
  useOrgContext: () => {
    if (ctxState.current === 'loading') {
      return { data: undefined, isLoading: true, isError: false, refetch: () => {} }
    }
    if (ctxState.current === 'error') {
      return { data: undefined, isLoading: false, isError: true, refetch: () => {} }
    }
    return {
      data: { permissions: permissions.current },
      isLoading: false,
      isError: false,
      refetch: () => {},
    }
  },
}))

import { CandidateDecisionBar } from '../components/hirelens/candidate-object/sections/decision-bar'
import { MultiselectToolbar } from '../components/hirelens/workspace/multiselect-toolbar'
import { StageMenu } from '../components/hirelens/workspace/stage-menu'
import { ApprovalCard } from '../components/hirelens/domain/approval-card'
import { usePermissionGate, PERMS } from '../components/hirelens/lib/use-can'
import type { Recommendation } from '@/types/agent'

// Straight from ROLE_PERMISSIONS (see docs/security/PERMISSION_MATRIX.md).
// `owner` differs from `admin` by exactly `org.manage` as of 29 Jul; neither
// distinction is exercised by the components under test, so `admin` stands in
// for both here.
const ROLES = {
  admin: [
    'member.manage', 'workspace.manage', 'feature_flag.manage',
    'api_key.manage', 'integration.manage', 'audit.view', 'usage.view',
    'campaign.manage', 'campaign.delete', 'campaign.view',
    'candidate.manage', 'candidate.view', 'ai.use', 'agent.manage', 'export',
  ],
  hiring_manager: [
    'workspace.manage', 'audit.view', 'usage.view',
    'campaign.manage', 'campaign.delete', 'campaign.view',
    'candidate.manage', 'candidate.view', 'ai.use', 'agent.manage', 'export',
  ],
  recruiter: [
    'campaign.manage', 'campaign.view', 'usage.view',
    'candidate.manage', 'candidate.view', 'ai.use', 'agent.manage', 'export',
  ],
  interviewer: ['campaign.view', 'candidate.view', 'ai.use'],
  viewer: ['campaign.view', 'candidate.view'],
} as const

const MUTATORS = ['admin', 'hiring_manager', 'recruiter'] as const
const READERS = ['interviewer', 'viewer'] as const

function asRole(role: keyof typeof ROLES) {
  permissions.current = [...ROLES[role]]
}

const noop = () => {}

const recommendation: Recommendation = {
  id: 'rec-1',
  title: 'Advance Ada Lovelace',
  status: 'pending',
  confidence: 0.9,
  why: 'Strong systems background.',
  recommended_action: 'Advance to onsite',
  candidate_name: 'Ada Lovelace',
  campaign_title: 'Staff Engineer',
  candidate_id: 'c1',
  campaign_id: 'r1',
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
} as Recommendation

beforeEach(() => {
  permissions.current = []
  ctxState.current = 'ready'
})
afterEach(cleanup)

/**
 * Regression: a failing `/org/context` must never be reported as a permission
 * problem. Caught in the browser, not by static analysis — the request 503s
 * intermittently, and the first version of the route gates told a full-permission
 * owner that Analytics was "available to hiring managers, admins, and owners".
 * A denial has to be something the server said, not something we failed to ask.
 */
describe('usePermissionGate — unknown is not denied', () => {
  function Probe() {
    const gate = usePermissionGate(PERMS.USAGE_VIEW)
    return <span data-testid="state">{gate.state}</span>
  }

  it('reports loading while the context is in flight', () => {
    ctxState.current = 'loading'
    render(<Probe />)
    expect(screen.getByTestId('state')).toHaveTextContent('loading')
  })

  it('reports error — never denied — when the context lookup fails', () => {
    ctxState.current = 'error'
    render(<Probe />)
    expect(screen.getByTestId('state')).toHaveTextContent('error')
  })

  it('denies only on a resolved context that lacks the permission', () => {
    asRole('viewer')
    render(<Probe />)
    expect(screen.getByTestId('state')).toHaveTextContent('denied')
  })

  it('allows on a resolved context that has it', () => {
    asRole('hiring_manager')
    render(<Probe />)
    expect(screen.getByTestId('state')).toHaveTextContent('allowed')
  })

  // Recruiters were granted usage.view on 29 Jul: Analytics is pipeline health
  // for the person running the pipeline. Asserted so a future permission tidy
  // cannot quietly take the whole screen away from them again.
  it('allows recruiters — analytics is theirs', () => {
    asRole('recruiter')
    render(<Probe />)
    expect(screen.getByTestId('state')).toHaveTextContent('allowed')
  })
})

describe('Candidate decision bar — candidate.manage', () => {
  it.each(MUTATORS)('%s is offered the decision', (role) => {
    asRole(role)
    render(
      <CandidateDecisionBar onAdvance={noop} onHold={noop} onReject={noop} onAddNote={noop} />,
    )
    expect(screen.getByRole('button', { name: /advance/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add note/i })).toBeInTheDocument()
  })

  it.each(READERS)('%s gets no decision bar at all', (role) => {
    asRole(role)
    render(
      <CandidateDecisionBar onAdvance={noop} onHold={noop} onReject={noop} onAddNote={noop} />,
    )
    // Not "disabled" — absent. A disabled Advance still says the decision is
    // theirs and merely unavailable, which is the wrong thing to say.
    expect(screen.queryByRole('button', { name: /advance/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /add note/i })).not.toBeInTheDocument()
  })

  it('renders nothing while the org context is still unknown', () => {
    permissions.current = []
    const { container } = render(
      <CandidateDecisionBar onAdvance={noop} onHold={noop} onReject={noop} onAddNote={noop} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})

describe('Bulk toolbar — candidate.manage for moves, ai.use for compare', () => {
  const toolbar = () => (
    <MultiselectToolbar
      count={3}
      canCompare
      onCompare={noop}
      onMove={noop}
      onReject={noop}
      onRemove={noop}
      onClear={noop}
    />
  )

  it.each(MUTATORS)('%s gets compare and the destructive moves', (role) => {
    asRole(role)
    render(toolbar())
    expect(screen.getByRole('button', { name: /compare/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /move to/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument()
  })

  it('interviewer keeps Compare (has ai.use) but loses every mutation', () => {
    asRole('interviewer')
    render(toolbar())
    expect(screen.getByRole('button', { name: /compare/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /move to/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^reject$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument()
  })

  it('viewer is left with the count and Clear', () => {
    asRole('viewer')
    render(toolbar())
    expect(screen.queryByRole('button', { name: /compare/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /move to/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /clear selection/i })).toBeInTheDocument()
    expect(screen.getByText('3 selected')).toBeInTheDocument()
  })
})

describe('Stage menu — degrades to a label, not a hole', () => {
  it.each(MUTATORS)('%s can change the stage', (role) => {
    asRole(role)
    render(<StageMenu stage="screening" onChange={noop} />)
    expect(screen.getByRole('button', { name: /screening/i })).toBeInTheDocument()
  })

  it.each(READERS)('%s still sees which stage it is, as static text', (role) => {
    asRole(role)
    render(<StageMenu stage="screening" onChange={noop} />)
    // The stage is information they are entitled to; only changing it is gated.
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText(/screening/i)).toBeInTheDocument()
  })
})

describe('Approval card — agent.manage', () => {
  it.each(MUTATORS)('%s can approve or dismiss', (role) => {
    asRole(role)
    render(<ApprovalCard recommendation={recommendation} onApprove={noop} onDismiss={noop} />)
    expect(screen.getByRole('button', { name: /approve|advance to onsite/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument()
  })

  it.each(READERS)('%s reads the recommendation but casts no verdict', (role) => {
    asRole(role)
    render(<ApprovalCard recommendation={recommendation} onApprove={noop} onDismiss={noop} />)
    expect(screen.getByText('Advance Ada Lovelace')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument()
  })
})
