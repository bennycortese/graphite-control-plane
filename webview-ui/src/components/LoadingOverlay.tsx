interface LoadingOverlayProps {
  visible: boolean;
}

export function LoadingOverlay({ visible }: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3"
      style={{
        background: "rgba(0, 0, 0, 0.4)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        animation: "overlay-fade-in 0.2s ease-out",
      }}
    >
      <div
        className="h-5 w-5 rounded-full"
        style={{
          border: "2px solid transparent",
          borderTopColor: "var(--accent)",
          borderRightColor: "rgba(124, 92, 252, 0.3)",
          animation: "spin 0.7s linear infinite",
        }}
      />
      <span
        className="text-[11px] font-medium"
        style={{
          color: "var(--muted-strong)",
          letterSpacing: "0.02em",
          animation: "pulse-text 1.8s ease-in-out infinite",
        }}
      >
        Loading...
      </span>
    </div>
  );
}
