export function AccentStripe() {
  return (
    <div
      className="h-[2px] opacity-70"
      style={{
        background:
          "linear-gradient(90deg, var(--accent), #a78bfa, var(--warm), var(--accent))",
        backgroundSize: "200% 100%",
        animation: "shimmer 8s ease-in-out infinite",
      }}
    />
  );
}
