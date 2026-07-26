// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { submitEvidenceReport, type ReportState } from '../components/homepage/report/actions'
import { recordEvidenceReport } from '../components/homepage/report/record-report'
import { ReportForm } from '../components/homepage/report/report-form'
import ReportPage from '../app/(marketing-v2)/report/page'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const IDLE: ReportState = { status: 'idle' }

const CONTEXT = {
  conclusionId: 'C-02',
  conclusion: 'Communicates clearly in writing',
  document: 'take-home-review.pdf',
  passage: 'Passage 3',
  fixtureVersion: '1.0.0',
}

const formDataOf = (fields: Record<string, string>) => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

/**
 * The evidence reporting workflow.
 *
 * Checklist §8.13: when a user tells us a conclusion is wrong, that signal must
 * reach us. The specific failure this suite guards against is the comfortable
 * one — a control that accepts input, shows a warm confirmation, and drops the
 * report. That version passes a visual review and fails the checkpoint
 * completely, so the tests are written against the RECORD, not the interface.
 */
describe('evidence reporting', () => {
  describe('the sink — reports must genuinely land', () => {
    it('writes a structured record and returns a reference', async () => {
      const log = vi.spyOn(console, 'log').mockImplementation(() => {})

      const result = await recordEvidenceReport({
        ...CONTEXT,
        account: 'The passage says the opposite.',
        contact: null,
      })

      expect(result.reference).toMatch(/^ER-[0-9A-F]{8}$/)
      expect(log).toHaveBeenCalledTimes(1)

      const record = JSON.parse(log.mock.calls[0][0] as string)
      expect(record.event).toBe('evidence_report')
      expect(record.reference).toBe(result.reference)
      expect(record.account).toBe('The passage says the opposite.')
    })

    /**
     * The report is useless without the citation. All five context fields
     * travel or the record cannot be reconciled against what the reader saw.
     */
    it('preserves every field needed to investigate', async () => {
      const log = vi.spyOn(console, 'log').mockImplementation(() => {})
      await recordEvidenceReport({ ...CONTEXT, account: 'Wrong.', contact: 'a@b.test' })

      const record = JSON.parse(log.mock.calls[0][0] as string)
      expect(record.conclusionId).toBe('C-02')
      expect(record.conclusion).toBe('Communicates clearly in writing')
      expect(record.document).toBe('take-home-review.pdf')
      expect(record.passage).toBe('Passage 3')
      expect(record.fixtureVersion).toBe('1.0.0')
      expect(record.contact).toBe('a@b.test')
      expect(record.surface).toBe('homepage/scene-05')
    })

    it('carries the reader’s account verbatim rather than paraphrased', async () => {
      const log = vi.spyOn(console, 'log').mockImplementation(() => {})
      const account = 'You cite passage 3 but passage 3 is about a different project entirely.'
      await recordEvidenceReport({ ...CONTEXT, account, contact: null })
      expect(JSON.parse(log.mock.calls[0][0] as string).account).toBe(account)
    })

    it('issues a distinct reference per report', async () => {
      vi.spyOn(console, 'log').mockImplementation(() => {})
      const a = await recordEvidenceReport({ ...CONTEXT, account: 'x', contact: null })
      const b = await recordEvidenceReport({ ...CONTEXT, account: 'x', contact: null })
      expect(a.reference).not.toBe(b.reference)
    })
  })

  describe('the action — no submission is ever simulated', () => {
    it('records and returns the reference on success', async () => {
      vi.spyOn(console, 'log').mockImplementation(() => {})
      const state = await submitEvidenceReport(
        IDLE,
        formDataOf({ ...CONTEXT, account: 'This is wrong.' })
      )
      expect(state.status).toBe('recorded')
      if (state.status === 'recorded') expect(state.reference).toMatch(/^ER-/)
    })

    it('refuses an empty account rather than recording nothing', async () => {
      const log = vi.spyOn(console, 'log').mockImplementation(() => {})
      const state = await submitEvidenceReport(IDLE, formDataOf({ ...CONTEXT, account: '   ' }))
      expect(state.status).toBe('error')
      // Nothing reached the sink — the refusal is real, not cosmetic.
      expect(log).not.toHaveBeenCalled()
    })

    it('omits contact rather than storing an empty string', async () => {
      const log = vi.spyOn(console, 'log').mockImplementation(() => {})
      await submitEvidenceReport(IDLE, formDataOf({ ...CONTEXT, account: 'x', contact: '' }))
      expect(JSON.parse(log.mock.calls[0][0] as string).contact).toBeNull()
    })

    /**
     * THE CENTRAL TEST. If the sink fails, the user is told it failed. A
     * confirmation shown over a failed write is indistinguishable — from where
     * the user stands — from a reporting control that was never wired up, and
     * it is worse, because they will stop looking for another way to tell us.
     */
    it('reports failure as failure when the record cannot be written', async () => {
      vi.spyOn(console, 'log').mockImplementation(() => {
        throw new Error('sink unavailable')
      })
      const state = await submitEvidenceReport(
        IDLE,
        formDataOf({ ...CONTEXT, account: 'This is wrong.' })
      )
      expect(state.status).toBe('error')
      if (state.status === 'error') expect(state.message).toMatch(/not recorded/i)
    })
  })

  describe('the form', () => {
    it('carries the context into the payload', () => {
      const { container } = render(<ReportForm context={CONTEXT} />)
      const hidden = Object.fromEntries(
        Array.from(container.querySelectorAll('input[type="hidden"]')).map((el) => [
          el.getAttribute('name'),
          el.getAttribute('value'),
        ])
      )
      expect(hidden).toEqual({
        conclusionId: 'C-02',
        conclusion: 'Communicates clearly in writing',
        document: 'take-home-review.pdf',
        passage: 'Passage 3',
        fixtureVersion: '1.0.0',
      })
    })

    it('omits the hidden payload entirely when there is no context to carry', () => {
      const { container } = render(<ReportForm context={null} />)
      expect(container.querySelectorAll('input[type="hidden"]')).toHaveLength(0)
    })

    it('shows no confirmation before anything has been recorded', () => {
      render(<ReportForm context={CONTEXT} />)
      expect(screen.queryByText(/Recorded/)).toBeNull()
      expect(screen.queryByText(/^ER-/)).toBeNull()
    })

    it('surfaces a real rejection when the account is empty', async () => {
      const user = userEvent.setup()
      render(<ReportForm context={CONTEXT} />)
      // `required` is bypassed so the SERVER-side refusal is what gets tested;
      // client validation is a convenience, not the guarantee.
      const field = screen.getByLabelText('What is wrong with it?')
      field.removeAttribute('required')
      await user.click(screen.getByRole('button', { name: 'Record this report' }))
      await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
      expect(screen.queryByText(/^ER-/)).toBeNull()
    })

    it('labels its control with what it does', () => {
      render(<ReportForm context={CONTEXT} />)
      expect(screen.getByRole('button', { name: 'Record this report' })).toBeInTheDocument()
    })

    it('marks contact as optional in the label the user actually reads', () => {
      render(<ReportForm context={CONTEXT} />)
      expect(
        screen.getByLabelText(/Email, if you want to be reachable about it — optional/)
      ).toBeInTheDocument()
    })
  })

  describe('/report', () => {
    const renderPage = async (params: Record<string, string>) =>
      render(await ReportPage({ searchParams: Promise.resolve(params) }))

    it('shows the reader which conclusion they are disputing', async () => {
      await renderPage({
        c: 'C-02',
        t: 'Communicates clearly in writing',
        d: 'take-home-review.pdf',
        p: 'Passage 3',
        v: '1.0.0',
      })
      expect(screen.getByText('C-02 — Communicates clearly in writing')).toBeInTheDocument()
      expect(screen.getByText('take-home-review.pdf')).toBeInTheDocument()
      expect(screen.getByText('1.0.0')).toBeInTheDocument()
    })

    /**
     * Half a citation is worse than none: it looks investigable and is not.
     * Partial context is therefore treated as absent, and the reader is told.
     */
    it('treats partial context as no context, and says so', async () => {
      await renderPage({ c: 'C-02', d: 'take-home-review.pdf' })
      expect(screen.getByText('No conclusion attached')).toBeInTheDocument()
      expect(screen.getByText(/please name the conclusion/)).toBeInTheDocument()
    })

    it('still accepts a report when arrived at directly', async () => {
      await renderPage({})
      expect(screen.getByRole('button', { name: 'Record this report' })).toBeInTheDocument()
    })

    it('promises no response it cannot honour', async () => {
      const { container } = await renderPage({})
      const text = (container.textContent ?? '').toLowerCase()
      for (const forbidden of [
        'we will investigate',
        'get back to you',
        'within 24',
        'our team will',
        'thank you for helping',
      ]) {
        expect(text).not.toContain(forbidden)
      }
    })
  })
})
