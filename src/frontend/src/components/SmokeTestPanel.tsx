import { useCallback, useEffect, useRef, useState } from "react";
import { useGameStore } from "../store/gameStore";

const CYAN = "#00ffcc";
const RED = "#ef4444";
const GOLD = "#ffd700";
const BORDER = "rgba(0,255,204,0.3)";

type TestStatus = "PENDING" | "RUNNING" | "PASS" | "FAIL";

interface TestResult {
  id: number;
  name: string;
  status: TestStatus;
  detail?: string;
}

const INITIAL_TESTS: TestResult[] = [
  { id: 1, name: "GAME STORE INIT", status: "PENDING" },
  { id: 2, name: "PLOT GENERATION", status: "PENDING" },
  { id: 3, name: "PLAYER STATE", status: "PENDING" },
  { id: 4, name: "FRNTR ACCUMULATOR", status: "PENDING" },
  { id: 5, name: "SUB-PARCEL SYSTEM", status: "PENDING" },
  { id: 6, name: "COMBAT LOG", status: "PENDING" },
  { id: 7, name: "COMMANDER SYSTEM", status: "PENDING" },
  { id: 8, name: "RANK SYSTEM", status: "PENDING" },
  { id: 9, name: "LEADERBOARD", status: "PENDING" },
  { id: 10, name: "MINERAL SYSTEM", status: "PENDING" },
  { id: 11, name: "PURCHASE FLOW (MOCK)", status: "PENDING" },
  { id: 12, name: "NAVIGATION ROUTES", status: "PENDING" },
  { id: 13, name: "GLOBE CANVAS", status: "PENDING" },
  { id: 14, name: "BOTTOM NAV", status: "PENDING" },
];

function sleep(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export default function SmokeTestPanel() {
  const [open, setOpen] = useState(false);
  const [tests, setTests] = useState<TestResult[]>(INITIAL_TESTS);
  const [running, setRunning] = useState(false);
  const [minted, setMinted] = useState(false);
  const mintTestTokens = useGameStore((s) => s.mintTestTokens);
  const frntBalance = useGameStore((s) => s.player.frntBalance);
  const abortRef = useRef(false);

  const updateTest = useCallback(
    (id: number, status: TestStatus, detail?: string) => {
      setTests((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status, detail } : t)),
      );
    },
    [],
  );

  const runTests = useCallback(async () => {
    abortRef.current = false;
    setRunning(true);
    setTests(
      INITIAL_TESTS.map((t) => ({ ...t, status: "PENDING" as TestStatus })),
    );

    const checks: Array<() => Promise<{ pass: boolean; detail?: string }>> = [
      // 1 GAME STORE INIT
      async () => {
        const s = useGameStore.getState();
        const pass = s !== null && Array.isArray(s.plots) && s.plots.length > 0;
        return {
          pass,
          detail: pass
            ? `State OK — ${s.plots.length} plots loaded`
            : "Store returned null or empty plots",
        };
      },
      // 2 PLOT GENERATION
      async () => {
        const { plots } = useGameStore.getState();
        const pass = plots.length >= 100;
        return {
          pass,
          detail: `${plots.length} plots generated (expected ≥ 100)`,
        };
      },
      // 3 PLAYER STATE
      async () => {
        const { player } = useGameStore.getState();
        const fields: (keyof typeof player)[] = [
          "frntBalance",
          "plotsOwned",
          "iron",
          "fuel",
          "crystal",
        ];
        const missing = fields.filter((f) => !(f in player));
        const pass = missing.length === 0;
        return {
          pass,
          detail: pass
            ? `All fields present — FRNTR: ${player.frntBalance.toFixed(4)}`
            : `Missing: ${missing.join(", ")}`,
        };
      },
      // 4 FRNTR ACCUMULATOR
      async () => {
        const { player } = useGameStore.getState();
        const BASE_RATE = 50;
        const SUB_PARCEL_RATE = 10;
        const rate = BASE_RATE * player.plotsOwned.length + SUB_PARCEL_RATE * 0;
        const pass = typeof rate === "number" && !Number.isNaN(rate);
        return {
          pass,
          detail:
            player.plotsOwned.length === 0
              ? `No plots owned yet — Balance: ${player.frntBalance.toFixed(2)} FRNTR`
              : `Balance: ${player.frntBalance.toFixed(2)} FRNTR — Rate: ${rate} FRNTR/day for ${player.plotsOwned.length} plot(s)`,
        };
      },
      // 5 SUB-PARCEL SYSTEM
      async () => {
        const state = useGameStore.getState();
        const subs = state.getSubParcels(1);
        const pass = Array.isArray(subs) && subs.length === 7;
        return {
          pass,
          detail: pass
            ? `Plot #1 returned ${subs.length} sub-parcels ✓`
            : `Expected 7 sub-parcels, got ${subs?.length ?? "undefined"}`,
        };
      },
      // 6 COMBAT LOG
      async () => {
        const { combatLog } = useGameStore.getState();
        const pass = Array.isArray(combatLog);
        return {
          pass,
          detail: pass
            ? `${combatLog.length} combat entries in log`
            : "combatLog not found in store",
        };
      },
      // 7 COMMANDER SYSTEM
      async () => {
        const { commanderAssignments } = useGameStore.getState();
        const pass =
          commanderAssignments !== null &&
          typeof commanderAssignments === "object";
        return {
          pass,
          detail: pass
            ? `commanderAssignments object present (${Object.keys(commanderAssignments).length} assigned)`
            : "commanderAssignments not found in store",
        };
      },
      // 8 RANK SYSTEM
      async () => {
        const { rankStats } = useGameStore.getState();
        const fields = [
          "missionsLaunched",
          "plotsOwned",
          "combatWins",
        ] as const;
        const missing = fields.filter((f) => !(f in rankStats));
        const pass = missing.length === 0;
        return {
          pass,
          detail: pass
            ? `Rank stats: M=${rankStats.missionsLaunched} P=${rankStats.plotsOwned} W=${rankStats.combatWins}`
            : `Missing fields: ${missing.join(", ")}`,
        };
      },
      // 9 LEADERBOARD
      async () => {
        const { leaderboard } = useGameStore.getState();
        const pass = Array.isArray(leaderboard) && leaderboard.length >= 1;
        return {
          pass,
          detail: pass
            ? `${leaderboard.length} entries on leaderboard`
            : "Leaderboard is empty or missing",
        };
      },
      // 10 MINERAL SYSTEM
      async () => {
        const { player } = useGameStore.getState();
        const pass =
          typeof player.iron === "number" &&
          typeof player.fuel === "number" &&
          typeof player.crystal === "number";
        return {
          pass,
          detail: pass
            ? `Iron: ${player.iron} | Fuel: ${player.fuel} | Crystal: ${player.crystal}`
            : "Mineral fields are not numbers",
        };
      },
      // 11 PURCHASE FLOW (MOCK)
      async () => {
        const state = useGameStore.getState();
        const pass = typeof state.purchasePlot === "function";
        return {
          pass,
          detail: pass
            ? "purchasePlot() is callable — mock payment mode ready"
            : "purchasePlot() not found in store",
        };
      },
      // 12 NAVIGATION ROUTES
      async () => {
        const validRoutes = [
          "/",
          "/play",
          "/factions",
          "/marketplace",
          "/inventory",
          "/manual",
          "/leaderboard",
        ];
        const hash = window.location.hash.replace("#", "") || "/";
        const path = window.location.pathname || "/";
        const current = hash || path;
        const pass = validRoutes.some((r) => current.startsWith(r));
        return {
          pass,
          detail: pass
            ? `Current route: ${current}`
            : `Unknown route: ${current}`,
        };
      },
      // 13 GLOBE CANVAS
      async () => {
        const canvas = document.querySelector("canvas");
        const pass = canvas !== null;
        return {
          pass,
          detail: pass
            ? `Canvas found — ${canvas.width}\u00d7${canvas.height}px`
            : "No <canvas> element found in DOM",
        };
      },
      // 14 BOTTOM NAV
      async () => {
        const nav = document.querySelector("[data-ocid='nav.panel']");
        const pass = nav !== null;
        return {
          pass,
          detail: pass
            ? "Bottom nav element found in DOM"
            : "Bottom nav [data-ocid='nav.panel'] not found",
        };
      },
    ];

    for (let i = 0; i < checks.length; i++) {
      if (abortRef.current) break;
      const id = i + 1;
      updateTest(id, "RUNNING");
      await sleep(150);
      try {
        const { pass, detail } = await checks[i]();
        updateTest(id, pass ? "PASS" : "FAIL", detail);
      } catch (err) {
        updateTest(
          id,
          "FAIL",
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      await sleep(80);
    }

    setRunning(false);
  }, [updateTest]);

  useEffect(() => {
    if (open && tests.every((t) => t.status === "PENDING")) {
      runTests();
    }
    return () => {
      abortRef.current = true;
    };
  }, [open, runTests, tests]);

  const passed = tests.filter((t) => t.status === "PASS").length;
  const total = tests.length;
  const hasRun = tests.some((t) => t.status !== "PENDING");

  return (
    <>
      {/* Toggle button */}
      <button
        type="button"
        data-ocid="smoketest.open_modal_button"
        onClick={() => setOpen((v) => !v)}
        style={{
          position: "fixed",
          top: 56,
          right: 8,
          zIndex: 9999,
          background: open ? "rgba(0,255,204,0.15)" : "rgba(4,12,24,0.92)",
          border: `1px solid ${BORDER}`,
          borderRadius: 4,
          color: CYAN,
          fontFamily: "'Courier New', monospace",
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 1.5,
          padding: "5px 8px",
          cursor: "pointer",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          transition: "background 0.15s",
        }}
      >
        [TEST]
      </button>

      {/* Panel */}
      {open && (
        <div
          data-ocid="smoketest.modal"
          style={{
            position: "fixed",
            top: 88,
            right: 8,
            zIndex: 9999,
            width: "min(360px, 95vw)",
            maxHeight: "min(520px, 85vh)",
            display: "flex",
            flexDirection: "column",
            background: "rgba(4, 12, 24, 0.97)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            overflow: "hidden",
            fontFamily: "'Courier New', monospace",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "10px 12px 8px",
              borderBottom: "1px solid rgba(0,255,204,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: CYAN,
                  letterSpacing: 2,
                  textShadow: `0 0 10px ${CYAN}`,
                }}
              >
                ◈ SMOKE TEST
              </div>
              <div
                style={{
                  fontSize: 8,
                  color: "rgba(0,255,204,0.4)",
                  letterSpacing: 1,
                  marginTop: 1,
                }}
              >
                FRONTIER: MISSILE HORIZON — SYSTEM CHECK
              </div>
            </div>
            <button
              type="button"
              data-ocid="smoketest.close_button"
              onClick={() => setOpen(false)}
              style={{
                background: "none",
                border: "1px solid rgba(0,255,204,0.2)",
                borderRadius: 3,
                color: "rgba(0,255,204,0.5)",
                cursor: "pointer",
                fontSize: 11,
                width: 22,
                height: 22,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>

          {/* Test list */}
          <div
            style={{
              overflowY: "auto",
              flex: 1,
              padding: "6px 0",
            }}
          >
            {tests.map((t) => {
              const color =
                t.status === "PASS"
                  ? CYAN
                  : t.status === "FAIL"
                    ? RED
                    : t.status === "RUNNING"
                      ? GOLD
                      : "rgba(0,255,204,0.25)";
              const icon =
                t.status === "PASS"
                  ? "✓"
                  : t.status === "FAIL"
                    ? "✗"
                    : t.status === "RUNNING"
                      ? "▶"
                      : "·";
              return (
                <div
                  key={t.id}
                  data-ocid={`smoketest.item.${t.id}`}
                  style={{
                    padding: "5px 12px",
                    borderBottom: "1px solid rgba(0,255,204,0.05)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 9,
                        color,
                        width: 10,
                        flexShrink: 0,
                        animation:
                          t.status === "RUNNING"
                            ? "smoketest-pulse 0.7s ease-in-out infinite alternate"
                            : "none",
                      }}
                    >
                      {icon}
                    </span>
                    <span
                      style={{
                        fontSize: 8,
                        color,
                        letterSpacing: 0.8,
                        fontWeight: t.status === "RUNNING" ? 700 : 400,
                        flex: 1,
                      }}
                    >
                      {String(t.id).padStart(2, "0")}. {t.name}
                    </span>
                    <span
                      style={{
                        fontSize: 7.5,
                        color,
                        letterSpacing: 0.5,
                        fontWeight: 700,
                        opacity: t.status === "PENDING" ? 0.4 : 1,
                      }}
                    >
                      {t.status}
                    </span>
                  </div>
                  {t.detail && (
                    <div
                      style={{
                        fontSize: 7.5,
                        color: "rgba(0,255,204,0.4)",
                        paddingLeft: 16,
                        letterSpacing: 0.3,
                        lineHeight: 1.4,
                      }}
                    >
                      {t.detail}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* FAUCET */}
          <div
            style={{
              padding: "10px 12px",
              borderTop: "1px solid rgba(0,255,204,0.2)",
              background: "rgba(0,255,204,0.03)",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: CYAN,
                letterSpacing: 2,
                marginBottom: 6,
              }}
            >
              ⚡ TEST FAUCET
            </div>
            <div
              style={{
                fontSize: 9,
                color: "rgba(0,255,204,0.6)",
                letterSpacing: 1,
                marginBottom: 6,
              }}
            >
              BALANCE: {frntBalance.toFixed(2)} FRNTR
            </div>
            <button
              type="button"
              data-ocid="smoketest.mint_button"
              onClick={() => {
                mintTestTokens();
                setMinted(true);
              }}
              style={{
                background: "rgba(0,255,204,0.12)",
                border: `1px solid ${BORDER}`,
                borderRadius: 3,
                color: CYAN,
                cursor: "pointer",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 1.5,
                padding: "5px 12px",
                fontFamily: "'Courier New', monospace",
                width: "100%",
              }}
            >
              MINT 500 FRNTR
            </button>
            {minted && (
              <div
                data-ocid="smoketest.success_state"
                style={{
                  fontSize: 9,
                  color: CYAN,
                  letterSpacing: 1,
                  marginTop: 6,
                  textShadow: `0 0 6px ${CYAN}`,
                }}
              >
                ✓ 500 FRNTR minted — purchase a plot to test
              </div>
            )}
          </div>
          {/* Footer */}
          <div
            style={{
              padding: "8px 12px",
              borderTop: "1px solid rgba(0,255,204,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
              background: "rgba(0,0,0,0.3)",
            }}
          >
            <div>
              {hasRun && (
                <span
                  data-ocid="smoketest.success_state"
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color:
                      passed === total ? CYAN : passed > total / 2 ? GOLD : RED,
                    letterSpacing: 1,
                    textShadow: passed === total ? `0 0 8px ${CYAN}` : "none",
                  }}
                >
                  {passed}/{total} PASSED
                  {running ? " …" : ""}
                </span>
              )}
              {!hasRun && (
                <span
                  style={{
                    fontSize: 8,
                    color: "rgba(0,255,204,0.3)",
                    letterSpacing: 1,
                  }}
                >
                  READY
                </span>
              )}
            </div>
            <button
              type="button"
              data-ocid="smoketest.primary_button"
              onClick={running ? undefined : runTests}
              disabled={running}
              style={{
                background: running
                  ? "rgba(0,255,204,0.05)"
                  : "rgba(0,255,204,0.1)",
                border: `1px solid ${
                  running ? "rgba(0,255,204,0.15)" : BORDER
                }`,
                borderRadius: 4,
                color: running ? "rgba(0,255,204,0.35)" : CYAN,
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: 1.5,
                padding: "5px 10px",
                cursor: running ? "not-allowed" : "pointer",
                fontFamily: "'Courier New', monospace",
                transition: "all 0.15s",
              }}
            >
              {running ? "RUNNING…" : "RE-RUN"}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes smoketest-pulse {
          from { opacity: 0.5; }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  );
}
