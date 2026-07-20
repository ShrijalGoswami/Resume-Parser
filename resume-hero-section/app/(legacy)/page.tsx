import { LandingNav } from "@/components/app/landing-nav"
import { HeroSection } from "@/components/hero"

export default function Page() {
  return (
    <main className="min-h-screen bg-background">
      <LandingNav />
      <HeroSection />
    </main>
  )
}
