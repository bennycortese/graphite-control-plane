interface ErrorBannerProps {
  error?: string;
}

export function ErrorBanner({ error }: ErrorBannerProps) {
  if (!error) return null;

  return (
    <div
      className="mx-4 my-2.5 flex items-center gap-1.5 rounded-lg px-3.5 py-2.5 text-xs"
      style={{
        color: "#f0b8b8",
        background: "var(--signal-bad-soft)",
        border: "1px solid rgba(248, 81, 73, 0.18)",
        boxShadow: "0 0 20px rgba(248, 81, 73, 0.06)",
      }}
    >
      <span>{error}</span>
    </div>
  );
}
