import { Users } from 'lucide-react'
import { Section } from './section'
import { Card } from '../ui/card'
import { EmptyState } from '../states/empty-state'

/**
 * Candidates Worth Your Time (UX Spec §6). There is no passive "new high-fit
 * candidates across roles" feed in the backend yet, and substituting search or
 * recent candidates would misrepresent the data — so this renders the designed
 * empty state until a real recommendation feed exists.
 */
export function WorthYourTimeSection() {
  return (
    <Section title="Candidates worth your time">
      <Card>
        <EmptyState
          variant="zero-results"
          icon={Users}
          title="Nothing to surface yet"
          description="AI recommendations aren't available yet for your workspace."
        />
      </Card>
    </Section>
  )
}
