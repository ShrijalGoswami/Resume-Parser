import type { Metadata } from 'next'
import { LearningScreen } from '@/components/hirelens/learning/learning-screen'

export const metadata: Metadata = { title: 'Learning' }

export default function Page() {
  return <LearningScreen />
}
