import { motion } from 'framer-motion';
import { ArrowRight, Mail, Lock } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default function Login() {
  const [rememberMe, setRememberMe] = useState(false);

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

          <h1 className="font-geist text-2xl font-bold text-foreground mb-2">Welcome back</h1>
          <p className="text-foreground/60 mb-6">Sign in to your account to continue.</p>

          <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Email</label>
              <Input type="email" placeholder="you@company.com" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Password</label>
              <Input type="password" placeholder="••••••••" />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-border"
                />
                <span className="text-sm text-foreground/70">Remember me</span>
              </label>
              <a href="/forgot-password" className="text-sm text-primary hover:underline font-medium">
                Forgot password?
              </a>
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
              Sign In
              <ArrowRight size={18} className="ml-2" />
            </Button>
          </form>

          <p className="text-sm text-foreground/60 text-center mt-6">
            Don't have an account?{' '}
            <a href="/signup" className="text-primary hover:underline font-medium">
              Sign up
            </a>
          </p>

          <p className="text-xs text-foreground/50 text-center mt-8">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </Card>
      </motion.div>
    </div>
  );
}
