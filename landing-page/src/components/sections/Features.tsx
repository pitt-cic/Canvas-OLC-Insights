import { motion } from 'motion/react';
import GlowCard from '../ui/GlowCard';

const features = [
  {
    title: 'Automated Course Ingestion',
    desc: 'Pulls all content from Canvas LMS — modules, pages, assignments, discussions, files, syllabus — in a single automated pipeline.',
    icon: <><polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" /><line x1="10" y1="12" x2="14" y2="12" /></>,
  },
  {
    title: 'AI-Powered Scoring',
    desc: '39 objectives evaluated by Claude Sonnet with structured output. Each score includes criteria-level verdicts and evidence-backed rationale.',
    icon: <><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></>,
  },
  {
    title: 'Human-in-the-Loop',
    desc: 'AI proposes, humans confirm. 11 objectives are reserved for human-only evaluation. Every AI score can be reviewed and adjusted.',
    icon: <><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><polyline points="17 11 19 13 23 9" /></>,
  },
  {
    title: 'Improvement Plans',
    desc: 'After finalization, Claude Haiku generates actionable recommendations for every objective scored below Exemplary.',
    icon: <><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" /></>,
  },
  {
    title: 'Historical Analytics',
    desc: 'Track scores over time with trend visualization. Measure improvement across review cycles.',
    icon: <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></>,
  },
  {
    title: 'Content Quality Checks',
    desc: 'Automated link validation, spelling analysis, and SSRF-protected URL checking across all course materials.',
    icon: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></>,
  },
];

export default function Features() {
  return (
    <section id="features" className="section">
      <div className="wrap">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ duration: 0.5 }} className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Powerful <span className="text-pitt-gold">Capabilities</span>
          </h2>
          <p className="text-muted max-w-2xl mx-auto">Everything you need to automate course quality reviews at scale.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {features.map((f, i) => (
            <GlowCard key={f.title} delay={i * 0.08}>
              <div className="w-10 h-10 rounded-lg bg-pitt-blue flex items-center justify-center text-white mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{f.icon}</svg>
              </div>
              <h3 className="text-base font-semibold text-ink mb-2">{f.title}</h3>
              <p className="text-sm text-muted">{f.desc}</p>
            </GlowCard>
          ))}
        </div>
      </div>
    </section>
  );
}
