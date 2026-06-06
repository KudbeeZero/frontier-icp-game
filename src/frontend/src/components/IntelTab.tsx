import GameLoreWindow from "./GameLoreWindow";

export function IntelTab() {
  return (
    <div
      style={{
        padding: "12px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        pointerEvents: "none",
      }}
    >
      <div style={{ pointerEvents: "auto", flex: 1 }}>
        <GameLoreWindow />
      </div>
    </div>
  );
}

export default IntelTab;
