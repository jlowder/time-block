const themes = [
  { key: 'study', label: 'Study', color: 'var(--theme-study)', bgColor: 'var(--theme-study-bg)' },
  { key: 'break', label: 'Break', color: 'var(--theme-break)', bgColor: 'var(--theme-break-bg)' },
  { key: 'exercise', label: 'Exercise', color: 'var(--theme-exercise)', bgColor: 'var(--theme-exercise-bg)' },
  { key: 'leisure', label: 'Leisure', color: 'var(--theme-leisure)', bgColor: 'var(--theme-leisure-bg)' },
  { key: 'special', label: 'Special', color: 'var(--theme-special)', bgColor: 'var(--theme-special-bg)' },
] as const;

export function ThemeLegend() {
  return (
    <div
      className="flex flex-col gap-2 px-3 py-3"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '8px',
      }}
    >
      <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
        Themes
      </span>
      <div className="flex flex-col gap-1.5">
        {themes.map(theme => (
          <div key={theme.key} className="flex items-center gap-2">
            <span
              className="flex items-center justify-center w-5 h-5 rounded-full border"
              style={{
                backgroundColor: theme.bgColor,
                borderColor: theme.color,
              }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.color }} />
            </span>
            <span className="text-xs text-[var(--text-secondary)]">{theme.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
