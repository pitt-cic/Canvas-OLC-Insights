import { motion } from 'motion/react';
import GlowCard from '../ui/GlowCard';

const tiers = [
  { size: 'Small', cost: '$0.80', desc: '3–5 modules, short syllabus, ~10 assignments' },
  { size: 'Medium', cost: '$1.20', desc: '8–12 modules, detailed syllabus, ~25 assignments', featured: true },
  { size: 'Large', cost: '$1.67', desc: '15+ modules, long syllabus, 50+ pages, PDFs' },
];

const projections = [
  { courses: '10', cost: '$8 – $17' },
  { courses: '50', cost: '$40 – $84' },
  { courses: '100', cost: '$80 – $167' },
  { courses: '500', cost: '$400 – $835' },
];

const breakdown = [
  { label: 'AI Scoring', pct: 96, tw: 'bg-pitt-blue' },
  { label: 'Summary', pct: 2, tw: 'bg-pitt-gold' },
  { label: 'Plan', pct: 1.5, tw: 'bg-ok' },
  { label: 'Infra', pct: 0.5, tw: 'bg-border-line' },
];

export default function Costs() {
  return (
    <section id="costs" className="section">
      <div className="wrap">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ duration: 0.5 }} className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Transparent <span className="text-pitt-gold">Pricing</span>
          </h2>
          <p className="text-muted max-w-2xl mx-auto">Pay only for what you use. Serverless architecture means zero infrastructure cost when idle.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-12">
          {tiers.map((t, i) => (
            <GlowCard key={t.size} delay={i * 0.1} className={`relative text-center ${t.featured ? '!border-pitt-blue !border-2' : ''}`}>
              {t.featured && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-pitt-gold px-4 py-1 text-xs font-bold text-pitt-blue">
                  Most Common
                </span>
              )}
              <p className="text-xs font-semibold uppercase tracking-widest text-faint mb-4">{t.size}</p>
              <p className="text-5xl font-bold text-pitt-blue mb-2">{t.cost}</p>
              <p className="text-sm text-faint mb-6">per review</p>
              <p className="text-sm leading-relaxed text-muted">{t.desc}</p>
            </GlowCard>
          ))}
        </div>

        <motion.div className="mx-auto max-w-3xl rounded-2xl bg-gradient-to-br from-pitt-blue to-pitt-blue-deep px-8 py-14 md:px-14 md:py-16 text-center mb-12"
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <p className="text-7xl md:text-8xl font-bold text-pitt-gold mb-4">$0</p>
          <p className="text-xl font-semibold text-white mb-4">Infrastructure Idle Cost</p>
          <p className="text-sm text-white/70 mb-10 max-w-md mx-auto">All services are pay-per-request. No provisioned capacity, no monthly minimums.</p>
          <div className="mx-auto max-w-md flex h-3 overflow-hidden rounded-full bg-white/15 mb-4">
            {breakdown.map((b) => (
              <div key={b.label} className={b.tw} style={{ width: `${b.pct}%`, minWidth: b.pct < 2 ? 8 : undefined }} />
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-white/60">
            {breakdown.map((b) => (
              <span key={b.label} className="flex items-center gap-1.5">
                <span className={`inline-block h-2 w-2 rounded-full ${b.tw}`} />{b.label} ({b.pct}%)
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div className="mx-auto max-w-xl glow-card p-8"
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }}>
          <h3 className="text-center font-semibold text-pitt-blue mb-6">Monthly Projections</h3>
          {projections.map((r, i) => (
            <div key={r.courses} className={`flex items-center justify-between py-4 text-sm ${i < projections.length - 1 ? 'border-b border-border-line/20' : ''}`}>
              <span className="text-muted">{r.courses} courses / month</span>
              <span className="font-bold text-base text-pitt-blue">{r.cost}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
