import { Link } from 'wouter';

export default function Footer() {
  return (
    <footer className="bg-foreground/5 border-t border-border mt-24">
      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-12">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <img src="/manus-storage/hirelens-logo_48bb43c6.png" alt="HireLens" className="w-6 h-6" />
              </div>
              <span className="font-bold text-foreground">HireLens</span>
            </div>
            <p className="text-sm text-foreground/60">Evidence over scores. Reasoning over ranking.</p>
          </div>

          <div>
            <h4 className="font-geist font-semibold text-foreground mb-4">Product</h4>
            <ul className="space-y-2">
              <li><Link href="/features"><a className="text-sm text-foreground/60 hover:text-foreground transition-colors">Features</a></Link></li>
              <li><Link href="/pricing"><a className="text-sm text-foreground/60 hover:text-foreground transition-colors">Pricing</a></Link></li>
              <li><Link href="/security"><a className="text-sm text-foreground/60 hover:text-foreground transition-colors">Security</a></Link></li>
              <li><Link href="/enterprise"><a className="text-sm text-foreground/60 hover:text-foreground transition-colors">Enterprise</a></Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-geist font-semibold text-foreground mb-4">Company</h4>
            <ul className="space-y-2">
              <li><Link href="/about"><a className="text-sm text-foreground/60 hover:text-foreground transition-colors">About</a></Link></li>
              <li><Link href="/blog"><a className="text-sm text-foreground/60 hover:text-foreground transition-colors">Blog</a></Link></li>
              <li><Link href="/careers"><a className="text-sm text-foreground/60 hover:text-foreground transition-colors">Careers</a></Link></li>
              <li><Link href="/contact"><a className="text-sm text-foreground/60 hover:text-foreground transition-colors">Contact</a></Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-geist font-semibold text-foreground mb-4">Resources</h4>
            <ul className="space-y-2">
              <li><Link href="/docs"><a className="text-sm text-foreground/60 hover:text-foreground transition-colors">Documentation</a></Link></li>
              <li><Link href="/request-demo"><a className="text-sm text-foreground/60 hover:text-foreground transition-colors">Request Demo</a></Link></li>
              <li><a href="#" className="text-sm text-foreground/60 hover:text-foreground transition-colors">API</a></li>
              <li><a href="#" className="text-sm text-foreground/60 hover:text-foreground transition-colors">Status</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-geist font-semibold text-foreground mb-4">Legal</h4>
            <ul className="space-y-2">
              <li><Link href="/privacy"><a className="text-sm text-foreground/60 hover:text-foreground transition-colors">Privacy</a></Link></li>
              <li><Link href="/terms"><a className="text-sm text-foreground/60 hover:text-foreground transition-colors">Terms</a></Link></li>
              <li><a href="#" className="text-sm text-foreground/60 hover:text-foreground transition-colors">Cookies</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between">
          <p className="text-sm text-foreground/60">© 2026 HireLens. All rights reserved.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a href="#" className="text-foreground/60 hover:text-foreground transition-colors">Twitter</a>
            <a href="#" className="text-foreground/60 hover:text-foreground transition-colors">LinkedIn</a>
            <a href="#" className="text-foreground/60 hover:text-foreground transition-colors">GitHub</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
