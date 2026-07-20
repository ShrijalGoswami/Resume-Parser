import type { Metadata } from 'next'
import { HomeScreen } from '@/components/hirelens/home/home-screen'

export const metadata: Metadata = { title: 'Home' }

export default function Page() {
  return <HomeScreen />
}
