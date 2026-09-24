import { motion } from 'motion/react';

const tags = ['Serverless', 'Auto-scaling', 'Event-driven', 'Step Functions', 'Secure Auth'];

export default function Architecture() {
  return (
    <section id="architecture" className="section">
      <div className="wrap">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ duration: 0.5 }} className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Serverless <span className="text-pitt-gold">Architecture</span>
          </h2>
          <p className="text-muted max-w-2xl mx-auto">Built on AWS serverless infrastructure. Scales to zero when idle, handles burst workloads without provisioning.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }} className="max-w-5xl mx-auto">
          <div className="glow-card p-4 md:p-8">
            <img src="./architecture-diagram.png"
              alt="Canvas OLC Insights System Architecture — AWS Cloud with CloudFront, API Gateway, Lambda, Step Functions, DynamoDB, S3, Cognito, and Bedrock"
              className="w-full rounded-lg" />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }} className="mt-12 flex flex-wrap justify-center gap-3">
          {tags.map((t) => (
            <span key={t} className="px-4 py-2 rounded-full bg-surface-blue border border-border-line/30 text-sm text-pitt-blue">{t}</span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
