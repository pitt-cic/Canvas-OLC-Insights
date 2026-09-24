import { motion } from 'motion/react';

export default function CallToAction() {
  return (
    <section id="cta" className="section relative overflow-hidden bg-gradient-to-br from-pitt-blue to-pitt-blue-deep">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-pitt-gold opacity-[0.1] blur-[120px] rounded-full" />

      <div className="wrap relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ duration: 0.5 }} className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            Ready to Transform <span className="text-pitt-gold">Course Reviews</span>?
          </h2>
          <p className="text-white/70 mb-8">Explore the codebase, deploy your own instance, or watch the demo to learn more.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="https://github.com/pitt-cic/Canvas-OLC-Insights-Public" target="_blank" rel="noopener noreferrer"
              className="btn-primary inline-flex items-center gap-2 no-underline">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              View on GitHub
            </a>
            <a href="#demo" className="px-6 py-3 rounded-xl border border-pitt-gold/30 text-white hover:bg-white/5 transition-colors inline-flex items-center gap-2 no-underline">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              Watch Demo
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
