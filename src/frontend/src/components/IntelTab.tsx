import { useGameStore } from "../store/gameStore";
import { SubParcelIntelView } from "./SubParcelIntelView";

export function IntelTab() {
  const selectedPlotId = useGameStore((s) => s.selectedPlotId);
  const plotsOwned = useGameStore((s) => s.player.plotsOwned);

  return (
    <div
      style={{
        padding: "12px",
        color: "#cdd6f4",
        fontFamily: "var(--font-body, sans-serif)",
      }}
    >
      <h2
        style={{
          fontSize: "12px",
          letterSpacing: "0.15em",
          color: "#00ffcc",
          fontFamily: "var(--font-mono, monospace)",
          textTransform: "uppercase",
          margin: "0 0 12px 0",
        }}
      >
        INTEL
      </h2>

      <div
        style={{
          background: "rgba(17,17,27,0.7)",
          border: "1px solid #313244",
          borderRadius: "6px",
          marginBottom: "8px",
        }}
      >
        <div
          style={{
            padding: "6px 10px",
            borderBottom: "1px solid #313244",
            fontSize: "10px",
            letterSpacing: "0.12em",
            color: "#7f849c",
            fontFamily: "var(--font-mono, monospace)",
          }}
        >
          SUB-PARCEL LAYOUT
        </div>

        <SubParcelIntelView
          plotId={selectedPlotId ?? 0}
          plotsOwned={plotsOwned}
        />
      </div>
    </div>
  );
}

export default IntelTab;
