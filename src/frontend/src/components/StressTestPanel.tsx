import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useRef, useState } from "react";
import { createActor } from "../backend";

const CYAN = "#00ffcc";
const CYAN_DIM = "rgba(0,255,204,0.35)";
const BORDER = "rgba(0,255,204,0.22)";
const TEXT = "#e0f4ff";

type CheckStatus = "idle" | "running" | "pass" | "fail";

interface CheckResult {
  label: string;
  status: CheckStatus;
  detail: string;
  durationMs: number;
}

const INITIAL_CHECKS: CheckResult[] = [
  {
    label: "1. Auth — get principal",
    status: "idle",
    detail: "",
    durationMs: 0,
  },
  {
    label: "2. Faucet — claim tokens",
    status: "idle",
    detail: "",
    durationMs: 0,
  },
  {
    label: "3. Player state — fetch balances",
    status: "idle",
    detail: "",
    durationMs: 0,
  },
  {
    label: "4. Plot count — canister seeded",
    status: "idle",
    detail: "",
    durationMs: 0,
  },
  {
    label: "5. Plot owners — sync ownership",
    status: "idle",
    detail: "",
    durationMs: 0,
  },
  {
    label: "6. Purchase plot — buy first available",
    status: "idle",
    detail: "",
    durationMs: 0,
  },
  {
    label: "7. FRNTR accrual — passive income > 0",
    status: "idle",
    detail: "",
    durationMs: 0,
  },
  {
    label: "8. Generator tiers — fetch tiers",
    status: "idle",
    detail: "",
    durationMs: 0,
  },
  {
    label: "9. Global stats — fetch stats",
    status: "idle",
    detail: "",
    durationMs: 0,
  },
  {
    label: "10. Leaderboard — fetch entries",
    status: "idle",
    detail: "",
    durationMs: 0,
  },
];

export default function StressTestPanel() {
  const [open, setOpen] = useState(false);
  const [checks, setChecks] = useState<CheckResult[]>(INITIAL_CHECKS);
  const [running, setRunning] = useState(false);
  const { actor } = useActor(createActor);
  const { isAuthenticated } = useInternetIdentity();
  // Persist purchased plotId so test #7 can reference it
  const purchasedPlotIdRef = useRef<bigint | null>(null);

  function updateCheck(index: number, patch: Partial<CheckResult>) {
    setChecks((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    );
  }

  async function runCheck<T>(
    index: number,
    fn: () => Promise<T>,
    validate: (result: T) => string,
  ): Promise<T | null> {
    updateCheck(index, {
      status: "running",
      detail: "running…",
      durationMs: 0,
    });
    const t0 = performance.now();
    try {
      const result = await fn();
      const detail = validate(result);
      updateCheck(index, {
        status: "pass",
        detail,
        durationMs: Math.round(performance.now() - t0),
      });
      return result;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      updateCheck(index, {
        status: "fail",
        detail: msg,
        durationMs: Math.round(performance.now() - t0),
      });
      return null;
    }
  }

  const handleRunAll = async () => {
    if (!actor || running) return;
    setRunning(true);
    setChecks(
      INITIAL_CHECKS.map((c) => ({ ...c, status: "idle" as CheckStatus })),
    );

    const _principal = await runCheck(
      0,
      () => actor.getPrincipal(),
      (r) => `${r.full.slice(0, 12)}… authed=${r.isAuthed}`,
    );

    await runCheck(
      1,
      () => actor.testFaucetV2(),
      (r) =>
        r.__kind__ === "ok"
          ? `+${Number(r.ok.frntGranted)} FRNTR +${Number(r.ok.icpGranted)} ICP`
          : `err: ${r.err}`,
    );

    const _playerState = await runCheck(
      2,
      () => actor.getPlayerState(),
      (r) => `FRNTR=${Number(r.frntBalance)} plots=${Number(r.plotsOwned)}`,
    );

    await runCheck(
      3,
      () => actor.getPlotCount(),
      (r) => `${Number(r)} plots on-chain`,
    );

    await runCheck(
      4,
      () => actor.getAllPlotOwners(),
      (r) => `${r.length} owned plots`,
    );

    // Test #6: find first unowned plot, then purchase it
    const purchaseRes = await runCheck(
      5,
      async () => {
        // Get all owned plot IDs (backend uses sequential bigint IDs)
        const owners = await actor.getAllPlotOwners();
        const ownedIds = new Set(
          owners.map(([id]: [bigint, string]) => Number(id)),
        );
        // Find the first sequential plot ID that has no owner
        const plotCount = Number(await actor.getPlotCount());
        let firstAvailable: bigint | null = null;
        for (let i = 0; i < plotCount; i++) {
          if (!ownedIds.has(i)) {
            firstAvailable = BigInt(i);
            break;
          }
        }
        if (firstAvailable === null)
          throw new Error("No available plots found");
        const result = await actor.purchasePlot(firstAvailable);
        if (result.__kind__ === "err") throw new Error(result.err);
        purchasedPlotIdRef.current = firstAvailable;
        return result;
      },
      (r) => `Purchased plot — ok: ${r.ok}`,
    );

    // Test #7: verify passive income > 0 (independent — works if player owns any plot)
    await runCheck(
      6,
      async () => {
        const state = await actor.getPlayerState();
        const income = state.passiveIncomePerDay;
        const plots = Number(state.plotsOwned);
        if (plots === 0 && purchaseRes === null) {
          throw new Error("Purchase prerequisite failed");
        }
        if (income < 7) {
          throw new Error(
            `passiveIncomePerDay=${income} — expected >= 7 (base rate for 1 plot)`,
          );
        }
        return { income, plots };
      },
      (r) => `passiveIncomePerDay=${r.income} plots=${r.plots} ✓`,
    );

    await runCheck(
      7,
      () => actor.getCoreGeneratorTiers(),
      (r) =>
        `${r.length} tiers, tier1 cost=${r[0] ? Number(r[0].costFRNTR) : "?"} FRNTR`,
    );

    await runCheck(
      8,
      () => actor.getGlobalStats(),
      (r) =>
        `supply=${Number(r.circulatingSupply)} plots=${Number(r.totalPlotsOwned)} players=${Number(r.activePlayers)}`,
    );

    await runCheck(
      9,
      () => actor.getLeaderboard(10n),
      (r) => `${r.length} entries`,
    );

    setRunning(false);
  };

  const handleReset = async () => {
    if (!actor || running) return;
    setRunning(true);
    try {
      const res = await actor.resetTestState();
      const detail = res.__kind__ === "ok" ? res.ok : res.err;
      setChecks(
        INITIAL_CHECKS.map((c, i) =>
          i === 0
            ? { ...c, status: res.__kind__ === "ok" ? "pass" : "fail", detail }
            : { ...c, status: "idle", detail: "" },
        ),
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setChecks(
        INITIAL_CHECKS.map((c, i) =>
          i === 0
            ? { ...c, status: "fail", detail: msg }
            : { ...c, status: "idle", detail: "" },
        ),
      );
    } finally {
      setRunning(false);
    }
  };

  const passCount = checks.filter((c) => c.status === "pass").length;
  const failCount = checks.filter((c) => c.status === "fail").length;
  const doneCount = passCount + failCount;

  return (
    <div
      data-ocid="stress_test.panel"
      style={{
        minWidth: 160,
      }}
    >
      {/* Toggle button */}
      <button
        type="button"
        data-ocid="stress_test.toggle"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          borderRadius: 6,
          background: open ? "rgba(0,255,204,0.12)" : "rgba(0,255,204,0.06)",
          border: `1px solid ${open ? CYAN : BORDER}`,
          color: CYAN,
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 1.5,
          cursor: "pointer",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          width: "100%",
          height: 32,
          justifyContent: "space-between",
        }}
      >
        <span>STRESS TEST</span>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {/* Expanded panel */}
      {open && (
        <div
          style={{
            marginTop: 4,
            borderRadius: 8,
            background: "rgba(2,10,20,0.94)",
            border: `1px solid ${BORDER}`,
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            padding: "10px 10px 8px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {!isAuthenticated && (
            <div style={{ fontSize: 9, color: "#ff6666", textAlign: "center" }}>
              Login required
            </div>
          )}

          <div style={{ display: "flex", gap: 5 }}>
            <button
              type="button"
              data-ocid="stress_test.run_all_button"
              disabled={running || !isAuthenticated}
              onClick={handleRunAll}
              style={{
                flex: 1,
                padding: "5px 8px",
                borderRadius: 5,
                background: running
                  ? "rgba(0,255,204,0.15)"
                  : "rgba(0,255,204,0.06)",
                border: `1px solid ${BORDER}`,
                color: running || !isAuthenticated ? CYAN_DIM : CYAN,
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: 1,
                cursor: running || !isAuthenticated ? "not-allowed" : "pointer",
                opacity: running || !isAuthenticated ? 0.5 : 1,
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              {running ? "RUNNING…" : "RUN ALL"}
            </button>
            <button
              type="button"
              data-ocid="stress_test.reset_button"
              disabled={running}
              onClick={handleReset}
              style={{
                padding: "5px 8px",
                borderRadius: 5,
                background: "rgba(255,68,68,0.08)",
                border: "1px solid rgba(255,68,68,0.3)",
                color: "#ff6666",
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: 1,
                cursor: running ? "not-allowed" : "pointer",
                opacity: running ? 0.5 : 1,
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              RESET
            </button>
          </div>

          {doneCount > 0 && (
            <div
              style={{ display: "flex", gap: 8, fontSize: 8, fontWeight: 700 }}
            >
              <span style={{ color: "#00ff88" }}>✓ {passCount} PASS</span>
              <span style={{ color: failCount > 0 ? "#ff4444" : CYAN_DIM }}>
                {failCount > 0 ? `✗ ${failCount} FAIL` : "✗ 0"}
              </span>
            </div>
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 3,
              maxHeight: 220,
              overflowY: "auto",
            }}
          >
            {checks.map((c, i) => (
              <div
                key={c.label}
                data-ocid={`stress_test.check.${i + 1}`}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 5,
                  padding: "4px 6px",
                  borderRadius: 4,
                  background:
                    c.status === "pass"
                      ? "rgba(0,255,136,0.04)"
                      : c.status === "fail"
                        ? "rgba(255,68,68,0.06)"
                        : c.status === "running"
                          ? "rgba(0,255,204,0.06)"
                          : "rgba(255,255,255,0.02)",
                  border: `1px solid ${
                    c.status === "pass"
                      ? "rgba(0,255,136,0.15)"
                      : c.status === "fail"
                        ? "rgba(255,68,68,0.2)"
                        : c.status === "running"
                          ? BORDER
                          : "rgba(255,255,255,0.06)"
                  }`,
                }}
              >
                <span
                  style={{
                    fontSize: 8,
                    color:
                      c.status === "pass"
                        ? "#00ff88"
                        : c.status === "fail"
                          ? "#ff4444"
                          : c.status === "running"
                            ? CYAN
                            : CYAN_DIM,
                    flexShrink: 0,
                    minWidth: 10,
                  }}
                >
                  {c.status === "pass"
                    ? "✓"
                    : c.status === "fail"
                      ? "✗"
                      : c.status === "running"
                        ? "▶"
                        : "·"}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 8,
                      color: c.status === "idle" ? CYAN_DIM : TEXT,
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.label}
                  </div>
                  {c.detail && (
                    <div
                      style={{
                        fontSize: 7,
                        color: c.status === "fail" ? "#ff8888" : CYAN_DIM,
                        marginTop: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.detail}
                    </div>
                  )}
                </div>
                {c.durationMs > 0 && (
                  <span style={{ fontSize: 7, color: CYAN_DIM, flexShrink: 0 }}>
                    {c.durationMs}ms
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
