interface BaseSelectorProps {
  selectedCount: number;
  maxBases: number;
  selectedBases: Set<number>;
  onCommit: () => void;
  loading: boolean;
}

export function BaseSelector({
  selectedCount,
  maxBases,
  selectedBases,
  onCommit,
  loading
}: BaseSelectorProps) {
  const canCommit = selectedCount === maxBases;
  const sortedBases = Array.from(selectedBases).sort((a, b) => a - b);

  return (
    <div className="bg-[rgba(0,167,181,0.05)] rounded-2xl p-6 border border-[rgba(0,167,181,0.3)] shadow-[0_0_20px_rgba(0,167,181,0.1)] flex flex-col gap-6">
      
      {/* Header */}
      <div>
        <h3 className="text-xl font-serif text-[var(--color-ink)] mb-2 tracking-wide flex items-center gap-2">
          Select Your Bases
        </h3>
        <p className="text-[var(--color-ink-muted)] text-sm leading-relaxed">
          Click on {maxBases} stars to secretly place your fleet.
        </p>
      </div>

      {/* Progress */}
      <div className="bg-black/30 rounded-xl p-4 border border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-display font-semibold">Bases Selected</span>
          <span className={`font-mono text-sm font-bold ${canCommit ? 'text-[var(--color-success)]' : 'text-[var(--color-ink)]'}`}>
            {selectedCount} <span className="text-gray-600">/</span> {maxBases}
          </span>
        </div>
        <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ease-out ${
              canCommit
                ? 'bg-[var(--color-success)] shadow-[0_0_10px_var(--color-success)]'
                : 'bg-[var(--color-accent)] shadow-[0_0_10px_var(--color-accent)]'
            }`}
            style={{ width: `${(selectedCount / maxBases) * 100}%` }}
          />
        </div>
      </div>

      {/* Selected bases list */}
      {selectedCount > 0 && (
        <div className="bg-black/30 rounded-xl p-4 border border-gray-800">
          <div className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-display font-semibold mb-3">Selected Stars</div>
          <div className="flex flex-wrap gap-2">
            {sortedBases.map(starId => (
              <span
                key={starId}
                className="px-2.5 py-1 bg-[rgba(0,167,181,0.15)] border border-[rgba(0,167,181,0.3)] rounded-md text-xs text-[var(--color-teal)] font-mono tracking-tight"
              >
                #{starId.toString().padStart(3, '0')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="flex flex-col gap-2 p-4 bg-gray-900/40 rounded-xl border border-gray-800/50">
        <p className="text-xs text-[var(--color-ink-muted)] flex items-start gap-2 leading-relaxed">
          <span className="text-[var(--color-accent)] mt-0.5 opacity-70">❖</span>
          Your base locations will be proven in zero-knowledge.
        </p>
        <p className="text-xs text-[var(--color-ink-muted)] flex items-start gap-2 leading-relaxed">
          <span className="text-[var(--color-accent)] mt-0.5 opacity-70">❖</span>
          Opponents guess coordinates; proofs verify hits/misses.
        </p>
        <p className="text-xs text-[var(--color-ink-muted)] flex items-start gap-2 leading-relaxed">
          <span className="text-[var(--color-accent)] mt-0.5 opacity-70">❖</span>
          Once committed to the blockchain, bases cannot be moved.
        </p>
      </div>

      {/* Commit button */}
      <div className="mt-2">
        <button
          onClick={onCommit}
          disabled={!canCommit || loading}
          className={`w-full py-3.5 rounded-xl font-semibold uppercase tracking-widest text-xs transition-all duration-300 font-display border
            ${canCommit && !loading
              ? 'bg-[rgba(0,167,181,0.2)] border-[var(--color-accent)] text-[var(--color-teal)] hover:bg-[rgba(0,167,181,0.3)] hover:shadow-[0_0_15px_rgba(0,167,181,0.4)] cursor-pointer'
              : 'bg-black/40 border-gray-800 text-gray-600 cursor-not-allowed'
            }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-3">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Committing...
            </span>
          ) : canCommit ? (
            'Commit Fleet Location'
          ) : (
            `Select ${maxBases - selectedCount} More Base${maxBases - selectedCount !== 1 ? 's' : ''}`
          )}
        </button>
      </div>
    </div>
  );
}
