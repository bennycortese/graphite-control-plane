interface TopBarProps {
  onSync: () => void;
  onSubmit: () => void;
  onRestack: () => void;
  onRefresh: () => void;
}

export function TopBar({ onSync, onSubmit, onRestack, onRefresh }: TopBarProps) {
  return (
    <div
      className="sticky top-0 z-[11] flex flex-row flex-wrap items-center justify-between gap-2.5 px-4 py-3"
      style={{
        background: "var(--background)",
        borderBottom: "1px solid var(--divider)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <span className="flex items-center gap-1.5">
        <span
          className="mr-2 text-[13px] font-bold"
          style={{
            color: "var(--foreground)",
            letterSpacing: "-0.01em",
            opacity: 0.9,
          }}
        >
          Graphite
        </span>
        <button className="gcp-btn gcp-btn-primary" onClick={onSync}>
          Pull &amp; Sync
        </button>
        <button className="gcp-btn" onClick={onSubmit}>
          Submit Stack
        </button>
        <button className="gcp-btn" onClick={onRestack}>
          Restack
        </button>
      </span>
      <span className="ml-auto flex items-center gap-1.5">
        <button
          className="gcp-btn-icon"
          onClick={onRefresh}
          title="Refresh"
        >
          &#x21bb;
        </button>
      </span>
    </div>
  );
}
