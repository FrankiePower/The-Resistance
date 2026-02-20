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
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white mb-1">
          Select Your Bases
        </h3>
        <p className="text-sm text-gray-400">
          Click on {maxBases} stars to place your secret bases
        </p>
      </div>

      {/* Progress */}
      <div className="bg-gray-900/50 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Bases Selected</span>
          <span className={`font-bold ${canCommit ? 'text-emerald-400' : 'text-white'}`}>
            {selectedCount} / {maxBases}
          </span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              canCommit
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                : 'bg-gradient-to-r from-blue-500 to-cyan-500'
            }`}
            style={{ width: `${(selectedCount / maxBases) * 100}%` }}
          />
        </div>
      </div>

      {/* Selected bases list */}
      {selectedCount > 0 && (
        <div className="bg-gray-900/50 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-2">Selected Stars</div>
          <div className="flex flex-wrap gap-1">
            {sortedBases.map(starId => (
              <span
                key={starId}
                className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded text-xs text-emerald-400 font-mono"
              >
                #{starId}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• Your base locations will be kept secret using ZK proofs</p>
        <p>• Opponents can only verify if a specific star is your base</p>
        <p>• Choose wisely - you cannot change bases after committing</p>
      </div>

      {/* Commit button */}
      <button
        onClick={onCommit}
        disabled={!canCommit || loading}
        className={`w-full py-3 rounded-lg font-semibold transition-all ${
          canCommit && !loading
            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg hover:shadow-emerald-500/25'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Committing Bases...
          </span>
        ) : canCommit ? (
          'Commit & Start Game'
        ) : (
          `Select ${maxBases - selectedCount} more base${maxBases - selectedCount !== 1 ? 's' : ''}`
        )}
      </button>
    </div>
  );
}
