/**
 * The Candidate Object — the single source of truth for candidate UI in V5.
 * Every surface (Inbox, Roles, Talent, Ledger) imports from here; the same model
 * renders as a Peek (rack-focus drawer) or a Full dossier at different densities.
 * Never build a second candidate UI — compose these.
 */

// Model + controller
export { buildCandidateModel, type CandidateModel } from './model'
export {
  useCandidateObject,
  useCandidateShortcuts,
  type CandidateObjectController,
  type CandidateShortcutHandlers,
} from './use-candidate-object'

// Reusable sections (the 13 primitives)
export { CandidateHeader } from './sections/header'
export { CandidateVerdict, CandidateConfidence, CandidateSummary } from './sections/ai'
export {
  CandidateStrengths,
  CandidateRisks,
  CandidateEvidence,
  CandidateSkills,
  CandidateInterviewQuestions,
} from './sections/evidence'
export { CandidateResume, CandidateNotes, CandidateActivity } from './sections/record'
export { CandidateDecisionBar } from './sections/decision-bar'

// Composed surfaces
export { CandidatePeek } from './candidate-peek'
export { CandidateFullDossier } from './candidate-full-dossier'
export { NoteDialog } from './note-dialog'
