const team = [
  { name: 'Avinash Kottakota', role: 'Developer', url: 'https://www.linkedin.com/in/avinash-kottakota/' },
  { name: 'Maciej Zukowski', role: 'Technical Lead', url: 'https://www.linkedin.com/in/maciejzukowski/' },
  { name: 'Kate Ulreich', role: 'Program Manager', url: 'https://www.linkedin.com/in/kate-ulreich-0a8902134/' },
  { name: 'Dwight Helfrich', role: 'Program Manager', url: 'https://www.linkedin.com/in/dwight-helfrich-53a233b/' },
  { name: 'Varun P. Shelke', role: 'Program Manager', url: 'https://www.linkedin.com/in/vashelke/' },
];

export default function Footer() {
  return (
    <footer className="border-t border-border-line/20 py-8 px-6">
      <div className="wrap flex flex-col md:flex-row items-start justify-between gap-8">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-md bg-pitt-blue flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
              </svg>
            </div>
            <span className="text-sm font-medium text-ink">Canvas OLC Insights</span>
          </div>
          <a href="https://github.com/pitt-cic/Canvas-OLC-Insights-Public" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-faint hover:text-pitt-blue transition-colors no-underline">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            GitHub
          </a>
          <a href="https://digital.pitt.edu/cic" target="_blank" rel="noopener noreferrer"
            className="text-sm text-pitt-blue hover:text-pitt-gold transition-colors no-underline">Pitt CIC</a>
        </div>

        <div className="flex flex-col gap-2 md:text-right">
          <span className="text-xs text-faint uppercase tracking-wider mb-1">Team</span>
          {team.map((m) => (
            <a key={m.name} href={m.url} target="_blank" rel="noopener noreferrer"
              className="text-sm text-muted hover:text-pitt-blue transition-colors flex items-center gap-2 md:justify-end no-underline">
              {m.name}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-faint"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
