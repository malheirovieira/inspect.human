export function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="fin-bar__track">
      <div className="fin-bar__fill" style={{ width: `${clamped}%` }} />
    </div>
  );
}
