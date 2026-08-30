export function Sparkle({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={`sparkle-twinkle pointer-events-none ${className}`}
      style={style}
    >
      <path d="M12 0c0 5.5 1 8.5 3 10.5S23 12 24 12c-5.5 0-8.5 1-10.5 3S12 23 12 24c0-5.5-1-8.5-3-10.5S1 12 0 12c5.5 0 8.5-1 10.5-3S12 1 12 0Z" />
    </svg>
  );
}
