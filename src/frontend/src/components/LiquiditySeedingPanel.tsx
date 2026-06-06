import { useActor } from "@caffeineai/core-infrastructure";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { createActor } from "../backend";
import { useGameStore } from "../store/gameStore";
import ActionConfirmModal from "./ActionConfirmModal";
import type { ConfirmDetail } from "./ActionConfirmModal";

function PotCard({
  label,
  value,
  usdPrice,
  colorClass,
  bgStyle,
  borderStyle,
}: {
  label: string;
  value: bigint;
  usdPrice: number | null;
  colorClass: string;
  bgStyle: string;
  borderStyle: string;
}) {
  const icp = Number(value) / 1e8;
  const usd = usdPrice !== null ? icp * usdPrice : null;
  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-1"
      style={{ background: bgStyle, border: `1px solid ${borderStyle}` }}
    >
      <div
        className={`text-[9px] font-bold tracking-widest uppercase ${colorClass}`}
      >
        {label}
      </div>
      <div className="font-mono text-sm font-bold" style={{ color: "#e0f4ff" }}>
        {icp.toFixed(4)} <span className="text-[9px] opacity-60">ICP</span>
      </div>
      {usd !== null && (
        <div
          className="text-[10px] font-medium"
          style={{ color: "rgba(224,244,255,0.5)" }}
        >
          ≈ ${usd.toFixed(2)} USD
        </div>
      )}
    </div>
  );
}

export default function LiquiditySeedingPanel() {
  const player = useGameStore((s) => s.player);
  const treasuryState = useGameStore((s) => s.treasuryState);
  const icpUsdPrice = useGameStore((s) => s.icpUsdPrice);
  const { actor } = useActor(createActor);
  const [expanded, setExpanded] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmDetails, setConfirmDetails] = useState<ConfirmDetail[]>([]);
  const [pendingAction, setPendingAction] = useState<
    (() => Promise<void>) | null
  >(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");

  if (!player.isAdmin) return null;

  const liquidityIcp = Number(treasuryState.liquidity) / 1e8;
  const totalPlayers = treasuryState.totalPlayers ?? 0;
  const totalPlotsSold = treasuryState.totalPlotsSold ?? 0;

  async function handleConfirm() {
    if (!pendingAction) return;
    setConfirmLoading(true);
    try {
      await pendingAction();
    } finally {
      setConfirmLoading(false);
      setConfirmOpen(false);
      setPendingAction(null);
    }
  }

  function triggerSeedLiquidity() {
    setConfirmTitle("Seed Liquidity Pool");
    setConfirmDetails([
      { label: "Liquidity Pot", value: `${liquidityIcp.toFixed(4)} ICP` },
      { label: "Destination", value: "ICPSwap ASCEND/ICP Pool" },
      { label: "Action", value: "Irreversible on-chain transfer" },
    ]);
    setPendingAction(() => async () => {
      if (!actor) return;
      try {
        // seedLiquidity is an admin-only canister call
        await (
          actor as unknown as { seedLiquidity?: () => Promise<void> }
        ).seedLiquidity?.();
        toast.success(
          "Liquidity seeding initiated. Check ICPSwap for confirmation.",
        );
      } catch (e) {
        toast.error(
          `Seed failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    });
    setConfirmOpen(true);
  }

  return (
    <>
      {/* Admin badge + toggle */}
      <motion.div
        data-ocid="admin.liquidity_panel"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-3"
      >
        <button
          type="button"
          data-ocid="admin.liquidity_toggle"
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200"
          style={{
            background: expanded
              ? "rgba(255,200,100,0.1)"
              : "rgba(255,200,100,0.05)",
            border: `1px solid ${expanded ? "rgba(255,200,100,0.4)" : "rgba(255,200,100,0.2)"}`,
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[10px]">🛡️</span>
            <span
              className="text-[10px] font-bold tracking-widest uppercase"
              style={{ color: "#ffc864" }}
            >
              Admin Dashboard
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="px-1.5 py-0.5 rounded text-[8px] font-bold"
              style={{
                background: "rgba(255,200,100,0.15)",
                color: "#ffc864",
                border: "1px solid rgba(255,200,100,0.3)",
              }}
            >
              ADMIN ONLY
            </span>
            <span
              className="text-[10px]"
              style={{ color: "rgba(224,244,255,0.5)" }}
            >
              {expanded ? "▲" : "▼"}
            </span>
          </div>
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <div
                className="mt-1 rounded-xl p-3"
                style={{
                  background: "rgba(5,15,28,0.85)",
                  border: "1px solid rgba(255,200,100,0.2)",
                }}
              >
                {/* Treasury overview row */}
                <div
                  className="text-[9px] font-bold tracking-widest uppercase mb-3"
                  style={{ color: "rgba(255,200,100,0.7)" }}
                >
                  Treasury Overview
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <PotCard
                    label="Dev Pot"
                    value={treasuryState.developer}
                    usdPrice={icpUsdPrice}
                    colorClass="text-amber-300"
                    bgStyle="rgba(255,200,100,0.06)"
                    borderStyle="rgba(255,200,100,0.2)"
                  />
                  <PotCard
                    label="Leaderboard"
                    value={treasuryState.leaderboard}
                    usdPrice={icpUsdPrice}
                    colorClass="text-cyan-300"
                    bgStyle="rgba(100,220,230,0.06)"
                    borderStyle="rgba(100,220,230,0.2)"
                  />
                  <PotCard
                    label="Liquidity"
                    value={treasuryState.liquidity}
                    usdPrice={icpUsdPrice}
                    colorClass="text-emerald-300"
                    bgStyle="rgba(0,255,204,0.06)"
                    borderStyle="rgba(0,255,204,0.2)"
                  />
                </div>

                {/* Network stats */}
                <div
                  className="grid grid-cols-2 gap-2 mb-3 p-2.5 rounded-lg"
                  style={{
                    background: "rgba(0,255,204,0.03)",
                    border: "1px solid rgba(0,255,204,0.08)",
                  }}
                >
                  <div>
                    <div
                      className="text-[8px] mb-0.5"
                      style={{ color: "rgba(224,244,255,0.4)" }}
                    >
                      TOTAL PLAYERS
                    </div>
                    <div
                      className="text-sm font-bold font-mono"
                      style={{ color: "#e0f4ff" }}
                    >
                      {totalPlayers.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-[8px] mb-0.5"
                      style={{ color: "rgba(224,244,255,0.4)" }}
                    >
                      PLOTS SOLD
                    </div>
                    <div
                      className="text-sm font-bold font-mono"
                      style={{ color: "#e0f4ff" }}
                    >
                      {totalPlotsSold.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Seed Liquidity action */}
                <div
                  className="p-2.5 rounded-lg mb-2"
                  style={{
                    background: "rgba(0,255,204,0.04)",
                    border: "1px solid rgba(0,255,204,0.12)",
                  }}
                >
                  <div
                    className="text-[9px] font-semibold mb-1"
                    style={{ color: "rgba(224,244,255,0.6)" }}
                  >
                    Seed ICPSwap Liquidity Pool
                  </div>
                  <div
                    className="text-[8px] mb-2"
                    style={{ color: "rgba(224,244,255,0.4)" }}
                  >
                    Transfers the full liquidity pot ({liquidityIcp.toFixed(4)}{" "}
                    ICP) to seed the ASCEND/ICP pool on ICPSwap. This action is
                    permanent and irreversible.
                  </div>
                  <button
                    type="button"
                    data-ocid="admin.seed_liquidity_button"
                    onClick={triggerSeedLiquidity}
                    disabled={liquidityIcp === 0}
                    className="w-full py-2 rounded-lg text-[9px] font-bold tracking-widest uppercase transition-all duration-200"
                    style={{
                      background:
                        liquidityIcp > 0
                          ? "rgba(0,255,204,0.12)"
                          : "rgba(255,255,255,0.04)",
                      border: `1px solid ${liquidityIcp > 0 ? "rgba(0,255,204,0.3)" : "rgba(255,255,255,0.08)"}`,
                      color:
                        liquidityIcp > 0 ? "#00ffcc" : "rgba(224,244,255,0.3)",
                      cursor: liquidityIcp > 0 ? "pointer" : "not-allowed",
                    }}
                  >
                    {liquidityIcp > 0
                      ? `SEED ${liquidityIcp.toFixed(4)} ICP → ICPSWAP`
                      : "NO LIQUIDITY TO SEED"}
                  </button>
                </div>

                <p
                  className="text-[8px] text-center"
                  style={{ color: "rgba(224,244,255,0.3)" }}
                >
                  All admin actions are logged on-chain with your principal and
                  timestamp.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <ActionConfirmModal
        isOpen={confirmOpen}
        onConfirm={handleConfirm}
        onCancel={() => {
          setConfirmOpen(false);
          setPendingAction(null);
        }}
        title={confirmTitle}
        actionType="purchase"
        details={confirmDetails}
        costLabel=""
        warningText="This action is permanent, irreversible, and logged on-chain."
        isLoading={confirmLoading}
      />
    </>
  );
}
