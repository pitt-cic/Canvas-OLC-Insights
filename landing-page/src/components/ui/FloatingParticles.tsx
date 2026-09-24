export default function FloatingParticles({ count = 12 }: { count?: number }) {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {Array.from({ length: count }, (_, i) => {
        const left = `${(i * 37 + 13) % 100}%`;
        const top = `${(i * 23 + 7) % 100}%`;
        const duration = `${8 + (i * 5) % 12}s`;
        const delay = `${(i * 2) % 8}s`;
        const size = 6 + (i % 5) * 2;
        return (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left,
              top,
              width: size,
              height: size,
              background: i % 3 === 0
                ? 'rgba(0, 53, 148, 0.06)'
                : 'rgba(255, 184, 28, 0.08)',
              animation: `particle-float ${duration} ${delay} ease-in-out infinite`,
            }}
          />
        );
      })}
    </div>
  );
}
