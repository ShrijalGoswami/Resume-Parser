import { motion } from 'framer-motion';
import { ArrowRight, Check, Zap } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import Footer from '@/components/Footer';
import Header from '@/components/Header';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
  viewport: { once: true }
};

const staggerContainer = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  viewport: { once: true }
};

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: 'url(/manus-storage/hero-background_0371a26f.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />

        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="max-w-3xl"
          >
            <h1 className="hero-h1 block text-foreground mb-6 leading-tight">
              Evidence over scores.
              <br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Reasoning over ranking.
              </span>
            </h1>
            <p className="text-lg text-foreground/70 mb-8 max-w-2xl leading-relaxed">
              HireLens is an AI-powered recruitment intelligence platform that helps enterprise teams make better hiring decisions. AI explains every recommendation with evidence. Humans always make the final decision.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="/signup" className="inline-block">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-lg" asChild>
                  <span>
                  Get Started Free
                  <ArrowRight className="ml-2" size={20} />
                  </span>
                </Button>
              </a>
              <a href="/request-demo" className="inline-block">
                <Button size="lg" variant="outline" className="text-lg" asChild>
                  <span>
                  Request Demo
                  </span>
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-24 bg-secondary/30">
        <div className="container">
          <motion.div {...fadeInUp} className="max-w-2xl mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">Why HireLens?</h2>
            <p className="text-lg text-foreground/70">
              Traditional hiring software gives meaningless scores. HireLens explains every recommendation with evidence.
            </p>
          </motion.div>

          <motion.div {...staggerContainer} className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Evidence-Based',
                description: 'See exactly which paragraphs in the resume, project descriptions, and experiences support each recommendation.',
                icon: '📋'
              },
              {
                title: 'Transparent Reasoning',
                description: 'Understand the AI\'s logic. No black boxes. No arbitrary scores. Just clear, explainable reasoning.',
                icon: '🧠'
              },
              {
                title: 'Human-Centered',
                description: 'AI assists recruiters. Humans always make the final hiring decision. Technology amplifies human judgment.',
                icon: '👥'
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="bg-card rounded-lg p-8 border border-border hover:border-accent/50 transition-colors"
              >
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="font-bold text-xl text-foreground mb-3">{item.title}</h3>
                <p className="text-foreground/70">{item.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="container">
          <motion.div {...fadeInUp} className="max-w-2xl mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">Powerful Features</h2>
            <p className="text-lg text-foreground/70">
              Everything you need to make better hiring decisions, powered by explainable AI.
            </p>
          </motion.div>

          <motion.div {...staggerContainer} className="grid md:grid-cols-2 gap-12">
            {[
              {
                title: 'Resume Intelligence',
                description: 'AI analyzes resumes and provides structured insights with evidence.',
                features: ['Skill extraction', 'Experience analysis', 'Evidence highlighting']
              },
              {
                title: 'Candidate Comparison',
                description: 'Compare candidates side-by-side with reasoning for each difference.',
                features: ['Visual comparison', 'Reasoning chains', 'Decision support']
              },
              {
                title: 'AI Copilot',
                description: 'Chat with AI to get insights, ask questions, and explore reasoning.',
                features: ['Natural language', 'Context aware', 'Markdown support']
              },
              {
                title: 'Semantic Search',
                description: 'Find candidates using natural language queries, not just keywords.',
                features: ['Smart filtering', 'Saved searches', 'AI recommendations']
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="bg-card rounded-lg p-8 border border-border"
              >
                <h3 className="font-bold text-2xl text-foreground mb-3">{item.title}</h3>
                <p className="text-foreground/70 mb-6">{item.description}</p>
                <ul className="space-y-2">
                  {item.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-3 text-foreground/80">
                      <Check size={18} className="text-accent" />
                      {f}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Evidence Visualization Section */}
      <section className="py-24 bg-foreground/5">
        <div className="container">
          <motion.div {...fadeInUp} className="max-w-2xl mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">See the Evidence</h2>
            <p className="text-lg text-foreground/70">
              Every recommendation comes with clear evidence from the candidate's resume and background.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="rounded-lg overflow-hidden border border-border bg-card"
          >
            <img
              src="/manus-storage/evidence-visualization_deb27103.png"
              alt="Evidence Visualization"
              className="w-full h-auto"
            />
          </motion.div>
        </div>
      </section>

      {/* Candidate Comparison Section */}
      <section className="py-24">
        <div className="container">
          <motion.div {...fadeInUp} className="max-w-2xl mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">Compare with Confidence</h2>
            <p className="text-lg text-foreground/70">
              Make better hiring decisions by comparing candidates with AI-powered reasoning for each difference.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="rounded-lg overflow-hidden border border-border bg-card"
          >
            <img
              src="/manus-storage/candidate-comparison_70fc3778.png"
              alt="Candidate Comparison"
              className="w-full h-auto"
            />
          </motion.div>
        </div>
      </section>

      {/* Security Section */}
      <section className="py-24 bg-secondary/30">
        <div className="container">
          <motion.div {...fadeInUp} className="max-w-2xl mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">Enterprise Security</h2>
            <p className="text-lg text-foreground/70">
              Built for enterprise teams with security, compliance, and privacy at the core.
            </p>
          </motion.div>

          <motion.div {...staggerContainer} className="grid md:grid-cols-2 gap-8">
            {[
              { icon: '🔒', title: 'SOC 2 Compliant', description: 'Enterprise-grade security and compliance' },
              { icon: '🔐', title: 'End-to-End Encryption', description: 'Your data is always protected' },
              { icon: '👤', title: 'Role-Based Access', description: 'Fine-grained permission controls' },
              { icon: '📋', title: 'Audit Logs', description: 'Complete visibility into all actions' }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="flex gap-4"
              >
                <div className="text-3xl">{item.icon}</div>
                <div>
                  <h3 className="font-geist font-bold text-foreground mb-1">{item.title}</h3>
                  <p className="text-foreground/70">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24">
        <div className="container">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">Simple, Transparent Pricing</h2>
            <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
              Start free. Scale as you grow. No hidden fees.
            </p>
          </motion.div>

          <motion.div {...staggerContainer} className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'Starter',
                price: 'Free',
                description: 'Perfect for getting started',
                features: ['Up to 100 candidates', 'Basic AI analysis', 'Email support']
              },
              {
                name: 'Professional',
                price: '$299',
                period: '/month',
                description: 'For growing teams',
                features: ['Unlimited candidates', 'Advanced AI analysis', 'Priority support', 'Team collaboration'],
                highlighted: true
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                description: 'For large organizations',
                features: ['Everything in Pro', 'Custom integrations', 'Dedicated support', 'SLA']
              }
            ].map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className={`rounded-lg p-8 border ${
                  plan.highlighted
                    ? 'border-accent bg-accent/5 ring-2 ring-accent'
                    : 'border-border bg-card'
                }`}
              >
                <h3 className="font-bold text-2xl text-foreground mb-2">{plan.name}</h3>
                <p className="text-foreground/70 text-sm mb-6">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  {plan.period && <span className="text-foreground/60">{plan.period}</span>}
                </div>
                <Button className="w-full mb-8" variant={plan.highlighted ? 'default' : 'outline'}>
                  Get Started
                </Button>
                <ul className="space-y-3">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-foreground/80">
                      <Check size={16} className="text-accent" />
                      {f}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary text-primary-foreground">
        <div className="container text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold mb-6">Ready to transform your hiring?</h2>
            <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
              Join enterprise teams that are making better hiring decisions with explainable AI.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/signup" className="inline-block">
                <Button size="lg" variant="secondary" asChild>
                  <span>
                  Start Free Trial
                  <ArrowRight className="ml-2" size={20} />
                  </span>
                </Button>
              </a>
              <a href="/request-demo" className="inline-block">
                <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10" asChild>
                  <span>
                  Schedule Demo
                  </span>
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
