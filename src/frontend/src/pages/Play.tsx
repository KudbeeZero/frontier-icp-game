import CombatLog from "../components/CombatLog";
import GlobeCanvas from "../components/GlobeCanvas";
import Navbar from "../components/Navbar";
import PlayerHUD from "../components/PlayerHUD";
import PlotInfoPanel from "../components/PlotInfoPanel";
import ResourceCard from "../components/ResourceCard";
import { useGameStore } from "../store/gameStore";

export default function Play() {
  const orbitalEvent = useGameStore((s) => s.orbitalEvent);

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ background: "#04070d" }}
    >
      {/* Full-screen globe */}
      <div className="absolute inset-0">
        <GlobeCanvas />
      </div>

      {/* Top nav */}
      <Navbar />

      {/* Orbital event banner */}
      {orbitalEvent && (
        <div
          className="fixed top-14 left-1/2 -translate-x-1/2 z-40 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider"
          style={{
            background: "linear-gradient(90deg, #F59E0B30, #EF444430)",
            border: "1px solid #F59E0B50",
            color: "#F59E0B",
          }}
        >
          ⚡ Orbital Event: {orbitalEvent.type} — Affects{" "}
          {orbitalEvent.affectedBiomes.join(", ")}
        </div>
      )}

      {/* Left sidebar */}
      <div className="fixed left-4 top-20 z-40 flex flex-col gap-2">
        <PlayerHUD />
        <ResourceCard />
      </div>

      {/* Right sidebar (plot info) */}
      <PlotInfoPanel />

      {/* Bottom combat log */}
      <CombatLog />
    </div>
  );
}
