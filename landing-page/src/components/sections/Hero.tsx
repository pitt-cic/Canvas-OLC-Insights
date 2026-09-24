import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';

const sections = [
  { name: 'Essential Design', score: 34, total: 40 },
  { name: 'Advanced Design', score: 24, total: 30 },
  { name: 'Course Delivery', score: 22, total: 30 },
];

const objectives = [
  { id: 'E1', label: 'Learning objectives are measurable', tier: 'Exemplary', tw: 'bg-blue-100 text-blue-700' },
  { id: 'A4', label: 'Generative AI guidelines provided', tier: 'Accomplished', tw: 'bg-yellow-100 text-yellow-700' },
  { id: 'D3', label: 'Regular announcements posted', tier: 'Developing', tw: 'bg-orange-100 text-orange-700' },
];

function ScoreRing({ score, total }: { score: number; total: number }) {
  const pct = score / total;
  const r = 38, circ = 2 * Math.PI * r;
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" className="shrink-0">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#DBEEFF" strokeWidth="6" />
      <motion.circle cx="50" cy="50" r={r} fill="none" stroke="#003594" strokeWidth="6" strokeLinecap="round"
        strokeDasharray={circ} initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: circ * (1 - pct) }}
        transition={{ duration: 1.2, ease: 'easeOut' }} transform="rotate(-90 50 50)" />
      <text x="50" y="46" textAnchor="middle" fill="#003594" fontSize="20" fontWeight="700" fontFamily="var(--font-sans)">{score}</text>
      <text x="50" y="62" textAnchor="middle" fill="#8896a6" fontSize="11" fontFamily="var(--font-sans)">/ {total}</text>
    </svg>
  );
}

function Bar({ label, score, total, delay }: { label: string; score: number; total: number; delay: number }) {
  return (
    <motion.div className="space-y-1.5" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay }}>
      <div className="flex justify-between text-xs font-medium">
        <span className="text-muted">{label}</span>
        <span className="text-pitt-blue">{score}/{total}</span>
      </div>
      <div className="h-2 rounded-full bg-surface-blue">
        <motion.div className="h-full rounded-full bg-gradient-to-r from-pitt-blue to-pitt-gold"
          initial={{ width: 0 }} animate={{ width: `${(score / total) * 100}%` }}
          transition={{ duration: 0.8, delay: delay + 0.2 }} />
      </div>
    </motion.div>
  );
}

export default function Hero() {
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 3000); return () => clearTimeout(t); }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16"
      style={{ background: 'linear-gradient(to bottom right, #003594, #002a78, #001d5c)' }}>
      <div className="absolute inset-0 pointer-events-none bg-grid" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-pitt-gold opacity-[0.08] blur-[120px] rounded-full" />

      <div className="wrap relative z-10 text-center px-6 py-20">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} className="mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/15 text-sm text-white/80">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            AI-Powered Course Review
          </div>
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 text-white">
          Course Quality Reviews in{' '}<br /><span className="text-pitt-gold">Under 3 Minutes</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10">
          Evaluate Canvas LMS courses against the OLC Quality Scorecard — 50 objectives, automated AI scoring, human-in-the-loop confirmation.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <a href="#demo" className="btn-primary inline-flex items-center gap-2 no-underline">Watch Demo</a>
          <a href="#architecture" className="px-6 py-3 rounded-xl border border-pitt-gold/30 text-white hover:bg-white/5 transition-colors no-underline">View Architecture</a>
        </motion.div>

        {/* Interactive demo card */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }}
          className="max-w-lg mx-auto">
          <div className="glow-card !bg-white p-6 md:p-8 text-left">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-faint mb-1">Course Review</p>
                <p className="text-sm font-semibold text-ink">ENGR 1001 — Intro to Engineering</p>
              </div>
              <span className="rounded-full bg-ok-bg text-ok px-3 py-1 text-xs font-medium">Completed</span>
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-border-line to-transparent mb-4" />

            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div key="load" className="flex items-center gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center shrink-0">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 rounded-full border-2 border-pitt-blue/30 border-t-pitt-blue" />
                  </div>
                  <div>
                    <p className="text-xs text-faint mb-1">AI Analysis</p>
                    <p className="text-sm text-muted">Analyzing course content...</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="result" className="space-y-5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                  <div className="flex items-center gap-5">
                    <ScoreRing score={80} total={100} />
                    <div>
                      <p className="text-3xl font-bold text-ink">80 <span className="text-sm font-normal text-faint">/ 100</span></p>
                      <p className="text-sm font-semibold text-pitt-gold">Accomplished</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {sections.map((s, i) => <Bar key={s.name} label={s.name} score={s.score} total={s.total} delay={i * 0.15} />)}
                  </div>
                  <div className="space-y-2">
                    {objectives.map((o, i) => (
                      <motion.div key={o.id} className="flex items-center justify-between rounded-lg bg-surface p-3 text-xs"
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.6 + i * 0.1 }}>
                        <span className="text-ink"><span className="font-mono font-medium text-faint mr-2">{o.id}</span>{o.label}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${o.tw}`}>{o.tier}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
