import { motion } from 'framer-motion';
import { ArrowRight, Mail, Lock, User, Building2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default function SignUp() {
  const [step, setStep] = useState(1);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="p-8">
          {/* Logo */}
          <Link href="/">
            <a className="flex items-center gap-2 mb-8 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <img src="/manus-storage/hirelens-logo_48bb43c6.png" alt="HireLens" className="w-6 h-6" />
              </div>
              <span className="font-bold text-foreground">HireLens</span>
            </a>
          </Link>

          {step === 1 ? (
            <>
              <h1 className="font-geist text-2xl font-bold text-foreground mb-2">Create your account</h1>
              <p className="text-foreground/60 mb-6">Join enterprise teams making better hiring decisions.</p>

              <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Full Name</label>
                  <Input placeholder="John Doe" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Email</label>
                  <Input type="email" placeholder="you@company.com" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Password</label>
                  <Input type="password" placeholder="••••••••" />
                </div>
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                  Continue
                  <ArrowRight size={18} className="ml-2" />
                </Button>
              </form>

              <p className="text-sm text-foreground/60 text-center mt-6">
                Already have an account?{' '}
                <a href="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </a>
              </p>
            </>
          ) : (
            <>
              <h1 className="font-geist text-2xl font-bold text-foreground mb-2">Organization details</h1>
              <p className="text-foreground/60 mb-6">Tell us about your team.</p>

              <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Organization Name</label>
                  <Input placeholder="Acme Corp" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Team Size</label>
                  <select className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground">
                    <option>1-10 people</option>
                    <option>11-50 people</option>
                    <option>51-200 people</option>
                    <option>200+ people</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Industry</label>
                  <select className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground">
                    <option>Technology</option>
                    <option>Finance</option>
                    <option>Healthcare</option>
                    <option>Other</option>
                  </select>
                </div>
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                  Create Account
                  <ArrowRight size={18} className="ml-2" />
                </Button>
              </form>

              <button
                onClick={() => setStep(1)}
                className="text-sm text-primary hover:underline mt-6 font-medium"
              >
                ← Back
              </button>
            </>
          )}

          <p className="text-xs text-foreground/50 text-center mt-8">
            By signing up, you agree to our Terms of Service and Privacy Policy.
          </p>
        </Card>
      </motion.div>
    </div>
  );
}
