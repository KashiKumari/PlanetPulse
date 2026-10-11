export default function TimeSlider({ min, max, value, onChange }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Timeline
        </span>
        <span className="font-display text-2xl font-bold text-primary">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full bg-muted appearance-none cursor-pointer accent-primary"
      />
      <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}