import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'wouter';
import { Button } from './ui/button';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/70 border-b border-border"
      >
        <div className="container flex items-center justify-between h-16">
          <Link href="/">
            <a className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <img src="/manus-storage/hirelens-logo_48bb43c6.png" alt="HireLens" className="w-6 h-6" />
              </div>
              <span className="font-bold text-lg text-foreground hidden sm:inline">HireLens</span>
            </a>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="/features">
              <a className="text-sm text-foreground/70 hover:text-foreground transition-colors">Features</a>
            </Link>
            <Link href="/pricing">
              <a className="text-sm text-foreground/70 hover:text-foreground transition-colors">Pricing</a>
            </Link>
            <Link href="/security">
              <a className="text-sm text-foreground/70 hover:text-foreground transition-colors">Security</a>
            </Link>
            <Link href="/blog">
              <a className="text-sm text-foreground/70 hover:text-foreground transition-colors">Blog</a>
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                Get Started
              </Button>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden border-t border-border bg-background/95 backdrop-blur-md"
          >
            <nav className="container py-4 flex flex-col gap-3">
              <Link href="/features">
                <a className="text-sm text-foreground/70 hover:text-foreground transition-colors py-2">Features</a>
              </Link>
              <Link href="/pricing">
                <a className="text-sm text-foreground/70 hover:text-foreground transition-colors py-2">Pricing</a>
              </Link>
              <Link href="/security">
                <a className="text-sm text-foreground/70 hover:text-foreground transition-colors py-2">Security</a>
              </Link>
              <Link href="/blog">
                <a className="text-sm text-foreground/70 hover:text-foreground transition-colors py-2">Blog</a>
              </Link>
            </nav>
          </motion.div>
        )}
      </motion.header>
      <div className="h-16" />
    </>
  );
}
