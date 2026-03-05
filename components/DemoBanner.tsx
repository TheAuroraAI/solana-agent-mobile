export function DemoBanner({ message }: { message?: string }) {
  return (
    <div className="mx-4 mb-4 flex items-center gap-2 px-3 py-2 bg-gray-800/60 border border-gray-700/40 rounded-xl">
      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
      <p className="text-gray-400 text-xs">
        {message ?? 'Simulated data — connect your wallet to see live information'}
      </p>
    </div>
  );
}
