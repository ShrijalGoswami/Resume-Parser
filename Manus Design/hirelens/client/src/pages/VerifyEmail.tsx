import { motion } from 'framer-motion';
import { ArrowRight, Mail, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default function VerifyEmail() {
  const [verified, setVerified] = useState(false);
  const [code, setCode] = useState('');

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

          {!verified ? (
            <>
              <h1 className="font-geist text-2xl font-bold text-foreground mb-2">Verify your email</h1>
              <p className="text-foreground/60 mb-6">We've sent a verification code to your email address.</p>

              <form onSubmit={(e) => { e.preventDefault(); setVerified(true); }} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Verification Code</label>
                  <Input
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    maxLength={6}
                    className="text-center text-lg tracking-widest"
                  />
                </div>

                <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                  Verify Email
                  <ArrowRight size={18} className="ml-2" />
                </Button>
              </form>

              <p className="text-sm text-foreground/60 text-center mt-6">
                Didn't receive a code?{' '}
                <button className="text-primary hover:underline font-medium">
                  Resend
                </button>
              </p>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={24} className="text-accent" />
                </div>
                <h1 className="font-geist text-2xl font-bold text-foreground mb-2">Email verified!</h1>
                <p className="text-foreground/60">Your email has been successfully verified.</p>
              </div>

              <a href="/app/dashboard" className="block">
                <Button className="w-full bg-primary hover:bg-primary/90">
                  Go to Dashboard
                  <ArrowRight size={18} className="ml-2" />
                </Button>
              </a>
            </>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
