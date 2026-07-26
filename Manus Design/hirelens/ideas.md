# HireLens Design Philosophy

## Brand Essence
**Positioning:** HireLens is an AI-powered recruitment intelligence platform for enterprise teams. It transforms hiring from opaque scoring to transparent reasoning—evidence over scores, reasoning over ranking, confidence without pretending certainty.

**Personality:** Trustworthy, Intelligent, Precise

## Design Direction: "Institutional Clarity"

### Design Movement
Inspired by institutional design (Apple, Stripe, Linear, Vercel) with emphasis on **clarity through structure** and **confidence through transparency**. The visual language prioritizes evidence and reasoning, mirroring the product's core philosophy.

### Core Principles
1. **Evidence-First Visualization**: Every UI element should feel like it's revealing data, not hiding it. Transparency in design mirrors transparency in AI reasoning.
2. **Institutional Precision**: Clean lines, generous whitespace, and deliberate typography create an atmosphere of professional rigor.
3. **Layered Depth**: Use subtle glass, soft shadows, and careful layering to create visual hierarchy without clutter.
4. **Motion as Guidance**: Animations guide attention to evidence and reasoning, never distract from content.

### Color Philosophy
**Primary Palette:**
- **Deep Slate** (`oklch(0.25 0.02 240)`): Primary accent—conveys trust, intelligence, precision
- **Soft White** (`oklch(0.98 0.001 0)`): Clean backgrounds, breathing room
- **Warm Gray** (`oklch(0.92 0.002 65)`): Secondary surfaces, subtle depth
- **Accent Teal** (`oklch(0.55 0.15 200)`): Highlights, success states, evidence markers
- **Warm Amber** (`oklch(0.65 0.12 60)`): Warnings, pending states
- **Soft Red** (`oklch(0.60 0.15 20)`): Destructive actions, risks

**Emotional Intent:** The palette feels institutional yet warm—professional without being cold. Deep slate conveys AI intelligence; teal represents clarity and insight.

### Layout Paradigm
- **Asymmetric Grids**: Avoid centered, uniform layouts. Use 60/40 or 70/30 splits for content hierarchy.
- **Generous Margins**: Large whitespace creates breathing room and emphasizes content importance.
- **Modular Sections**: Each section has distinct visual treatment—not all white cards, not all flat.
- **Sidebar Navigation**: For app modules, use persistent left sidebar with glass treatment.

### Signature Elements
1. **Evidence Cards**: Subtle glass containers with soft shadows and teal accent borders for highlighting reasoning
2. **Reasoning Chains**: Visual connectors showing AI reasoning flow (arrows, lines, hierarchies)
3. **Data Visualization**: Charts with teal accents, soft gradients, and clear legends
4. **Glass Navigation**: Frosted glass nav bars with backdrop blur, not solid backgrounds

### Interaction Philosophy
- **Instant Feedback**: Buttons scale on press (0.97x), inputs highlight on focus
- **Smooth Transitions**: All state changes use 180-250ms easing (ease-out for enter, ease-in-out for morph)
- **Hover Elevation**: Cards lift slightly on hover, glass surfaces brighten
- **Loading States**: Skeleton screens with pulsing animation, never spinners
- **Empty States**: Beautiful, illustrated empty states that explain what to do next

### Animation Guidelines
- **Page Transitions**: Fade + subtle scale (0.95 → 1.0) over 300ms
- **Section Reveals**: Staggered entrance animations (30-50ms per item)
- **Hover Effects**: 150ms ease-out for all interactive elements
- **Loading**: Pulse animation on skeletons, never aggressive spinners
- **Modals**: Scale from 0.95 with fade, centered origin, 250ms duration
- **Respect Motion**: All animations gated behind `@media (prefers-reduced-motion: no-preference)`

### Typography System
**Font Pairing:**
- **Display**: Geist (bold, 700) for headlines—modern, geometric, confident
- **Body**: Inter (regular, 500) for content—readable, neutral, professional
- **Mono**: JetBrains Mono for code/evidence snippets—technical, precise

**Hierarchy:**
- H1: 48px, 700 weight, 1.1 line-height (hero titles)
- H2: 32px, 700 weight, 1.2 line-height (section titles)
- H3: 24px, 600 weight, 1.3 line-height (subsection titles)
- Body: 16px, 400 weight, 1.6 line-height (readable, comfortable)
- Small: 14px, 400 weight, 1.5 line-height (secondary info)
- Micro: 12px, 500 weight, 1.4 line-height (labels, captions)

### Brand Voice
**Tone:** Professional, confident, transparent. No marketing fluff. Every sentence explains value.

**Example Headlines:**
- ✅ "See exactly why we recommend this candidate" (transparent, evidence-focused)
- ✅ "AI that explains, humans that decide" (philosophy-driven)
- ❌ "Welcome to HireLens" (generic)
- ❌ "Get started today" (cliché)

**Example CTAs:**
- ✅ "Explore the evidence"
- ✅ "Compare candidates with reasoning"
- ❌ "Learn more"
- ❌ "Sign up now"

### Signature Brand Color
**Deep Slate** (`oklch(0.25 0.02 240)`) — This is unmistakably HireLens. Used in:
- Primary buttons
- Logo/wordmark
- Key accent elements
- Sidebar active states

### Wordmark & Logo Concept
**Logo:** A minimalist geometric mark combining:
- A stylized **lens** shape (circle with gradient)
- An **upward arrow** or **insight symbol** inside
- Color: Deep slate with teal accent
- Style: Bold, geometric, no text

**Wordmark:** "HireLens" in Geist Bold, deep slate, with the logo to the left

---

## Design System Implementation

### Color Tokens (CSS Variables)
```
--primary: oklch(0.25 0.02 240)        // Deep Slate
--primary-foreground: oklch(0.98 0.001 0)  // Soft White
--accent: oklch(0.55 0.15 200)         // Teal
--secondary: oklch(0.92 0.002 65)      // Warm Gray
--muted: oklch(0.96 0.001 0)           // Very Light Gray
--destructive: oklch(0.60 0.15 20)     // Soft Red
--background: oklch(0.98 0.001 0)      // Soft White
--foreground: oklch(0.15 0.02 240)     // Deep Slate Text
```

### Spacing Scale
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px
- 3xl: 64px

### Border Radius
- sm: 4px (tight, inputs)
- md: 8px (cards, buttons)
- lg: 12px (large containers)
- xl: 16px (hero sections)

### Shadows
- sm: 0 1px 2px rgba(0,0,0,0.05)
- md: 0 4px 6px rgba(0,0,0,0.07)
- lg: 0 10px 15px rgba(0,0,0,0.1)
- xl: 0 20px 25px rgba(0,0,0,0.15)

### Glass Effect
- Background: rgba(255, 255, 255, 0.7)
- Backdrop Filter: blur(12px)
- Border: 1px solid rgba(255, 255, 255, 0.3)

---

## Visual Language Rules

### DO
✅ Use generous whitespace  
✅ Layer elements with subtle shadows  
✅ Use glass for navigation and floating panels  
✅ Pair teal accents with deep slate  
✅ Create visual hierarchy through typography  
✅ Use motion to guide attention  
✅ Show evidence and reasoning visually  

### DON'T
❌ Overuse glass (only nav, modals, floating panels)  
❌ Make everything white cards  
❌ Use flat design without depth  
❌ Animate without purpose  
❌ Hide information behind scores  
❌ Use trendy gradients or neon effects  
❌ Create centered, uniform layouts  

---

## Implementation Checklist

- [ ] Update CSS variables in index.css with new color palette
- [ ] Add Geist font to index.html
- [ ] Create global layout with glass navigation
- [ ] Build component library with glass effects
- [ ] Implement motion system with Framer Motion
- [ ] Design homepage with asymmetric layout
- [ ] Build dashboard with sidebar navigation
- [ ] Create evidence visualization components
- [ ] Implement reasoning chain visualizations
- [ ] Add empty/loading/error states to all pages
- [ ] Test responsive design on mobile/tablet
- [ ] Verify accessibility (WCAG AA)
- [ ] Polish animations and transitions
