import { motion } from 'motion/react';

export default function Demo() {
  return (
    <section id="demo" className="section relative bg-surface">
      <div className="wrap relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ duration: 0.5 }} className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            See It In <span className="text-pitt-gold">Action</span>
          </h2>
          <p className="text-muted max-w-2xl mx-auto">Watch how Canvas OLC Insights evaluates an entire course against the OLC Quality Scorecard in minutes.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }} className="max-w-4xl mx-auto">
          <div className="terminal-window shadow-2xl">
            <div className="terminal-header">
              <div className="terminal-dot terminal-dot-red" />
              <div className="terminal-dot terminal-dot-yellow" />
              <div className="terminal-dot terminal-dot-green" />
              <span className="ml-2 text-xs text-white/40">Canvas OLC Insights Demo</span>
            </div>
            <div className="relative aspect-video bg-black">
              <video className="w-full h-full" controls preload="metadata" playsInline>
                <source src="./demo.mp4" type="video/mp4" />
              </video>
            </div>
          </div>
          <div className="h-20 bg-gradient-to-b from-pitt-blue-deep/30 to-transparent -mt-1 rounded-b-xl blur-xs" />
        </motion.div>
      </div>
    </section>
  );
}
