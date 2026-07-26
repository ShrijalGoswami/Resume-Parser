import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default function RequestDemo() {
  const [submitted, setSubmitted] = useState(false);

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

          {!submitted ? (
            <>
              <h1 className="font-geist text-2xl font-bold text-foreground mb-2">Request a demo</h1>
              <p className="text-foreground/60 mb-6">See HireLens in action. Our team will reach out within 24 hours.</p>

              <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Full Name</label>
                  <Input placeholder="John Doe" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Email</label>
                  <Input type="email" placeholder="you@company.com" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Company</label>
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

                <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                  Request Demo
                  <ArrowRight size={18} className="ml-2" />
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={24} className="text-accent" />
                </div>
                <h1 className="font-geist text-2xl font-bold text-foreground mb-2">Demo requested!</h1>
                <p className="text-foreground/60">Thanks for your interest. Our team will contact you soon.</p>
              </div>

              <div className="bg-secondary/30 rounded-lg p-4 mb-6">
                <p className="text-sm text-foreground/70">
                  In the meantime, check out our documentation or explore the platform.
                </p>
              </div>

              <a href="/" className="block">
                <Button variant="outline" className="w-full">
                  Back to Home
                </Button>
              </a>
            </>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
