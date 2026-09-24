import { motion } from 'motion/react';

const tech = [
  { name: 'Amazon Bedrock', desc: 'Claude Sonnet & Haiku' },
  { name: 'AWS Lambda', desc: '7 serverless functions' },
  { name: 'Step Functions', desc: 'Workflow orchestration' },
  { name: 'DynamoDB', desc: 'Reviews + course history' },
  { name: 'S3 + CloudFront', desc: 'Content & hosting' },
  { name: 'Cognito', desc: 'User authentication' },
  { name: 'React 19 + TS', desc: 'Frontend framework' },
  { name: 'PydanticAI', desc: 'Structured AI output' },
];

export default function TechStack() {
  return (
    <section id="tech-stack" className="section bg-surface">
      <div className="wrap">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ duration: 0.5 }} className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Built With <span className="text-pitt-gold">Modern Tech</span>
          </h2>
          <p className="text-muted max-w-2xl mx-auto">A fully serverless stack powered by AWS and modern AI frameworks.</p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {tech.map((t, i) => (
            <motion.div key={t.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="flex flex-col items-center justify-center p-6 rounded-xl glow-card text-center cursor-default">
              <span className="text-sm font-medium text-ink mb-1">{t.name}</span>
              <span className="text-xs text-faint">{t.desc}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
