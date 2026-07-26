import { motion } from 'framer-motion';
import { ArrowRight, Mail } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="p-8">
          <Link href="/">
            <a className="flex items-center gap-2 mb-8 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <img src="/manus-storage/hirelens-logo_48bb43c6.png" alt="HireLens" className="w-6 h-6" />
              </div>
              <span className="font-bold text-foreground">HireLens</span>
            </a>
          </Link>

          {!sent ? (
            <>
              <h1 className="font-geist text-2xl font-bold text-foreground mb-2">Reset your password</h1>
              <p className="text-foreground/60 mb-6">Enter your email address and we'll send you a link to reset your password.</p>

              <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Email</label>
                  <Input type="email" placeholder="you@company.com" />
                </div>

                <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                  Send Reset Link
                  <ArrowRight size={18} className="ml-2" />
                </Button>
              </form>

              <p className="text-sm text-foreground/60 text-center mt-6">
                Remember your password?{' '}
                <a href="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </a>
              </p>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
                  <Mail size={24} className="text-accent" />
                </div>
                <h1 className="font-geist text-2xl font-bold text-foreground mb-2">Check your email</h1>
                <p className="text-foreground/60">We've sent a password reset link to your email address.</p>
              </div>

              <div className="bg-secondary/30 rounded-lg p-4 mb-6">
                <p className="text-sm text-foreground/70">
                  Didn't receive the email? Check your spam folder or{' '}
                  <button onClick={() => setSent(false)} className="text-primary hover:underline font-medium">
                    try again
                  </button>
                  .
                </p>
              </div>

              <a href="/login" className="block text-center text-primary hover:underline font-medium">
                Back to sign in
              </a>
            </>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
