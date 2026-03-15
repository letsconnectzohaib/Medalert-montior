interface TimeFilterProps {
  value: number;
  onChange: (minutes: number) => void;
}

const filters = [
  { label: "30m", value: 30 },
  { label: "1h", value: 60 },
  { label: "3h", value: 180 },
  { label: "Full Shift", value: 720 },
];

export function TimeFilter({ value, onChange }: TimeFilterProps) {
  return (
    <div className="flex items-center gap-1 bg-secondary rounded-md p-1">
      {filters.map(f => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
            value === f.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
