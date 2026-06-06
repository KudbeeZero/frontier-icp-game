import { useActor } from "@caffeineai/core-infrastructure";
import { useEffect, useState } from "react";
import { createActor } from "../backend";
import type { ActionAuditEntry } from "../backend";

const CYAN = "#00ffcc";
const CYAN_DIM = "rgba(0,255,204,0.35)";
const BORDER = "rgba(0,255,204,0.22)";
const TEXT = "#e0f4ff";
const TEXT_DIM = "rgba(224,244,255,0.45)";

function fmtTimestamp(ts: bigint): string {
  try {
    // ICP timestamps are nanoseconds
    const ms = Number(ts / 1_000_000n);
    if (ms < 1_000_000) return "--";
    return new Date(ms).toLocaleString();
  } catch {
    return "--";
  }
}

function fmtAmount(amount: bigint | undefined, action: string): string {
  if (amount === undefined || amount === null) return "";
  const isIcp = action.toLowerCase().includes("purchase");
  const val = Number(amount) / 1e8;
  return isIcp ? `${val.toFixed(4)} ICP` : `${val.toFixed(4)} FRNTR`;
}

const DECISION_COLORS: Record<string, string> = {
  confirmed: "#22c55e",
  cancelled: "#ef4444",
};

const ACTION_ICONS: Record<string, string> = {
  purchasePlot: "🌍",
  upgradeGenerator: "⚡",
  claimAccumulatedTokens: "💰",
  claimAllPlots: "💰",
  startSurvey: "🔭",
  completeMission: "🏆",
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuditHistoryPanel({ isOpen, onClose }: Props) {
  const { actor } = useActor(createActor);
  const [entries, setEntries] = useState<Array<[bigint, ActionAuditEntry]>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !actor) return;
    setLoading(true);
    setError(null);
    actor
      .getMyAuditLog()
      .then((log) => {
        // Sort by timestamp descending
        const sorted = [...log].sort((a, b) => Number(b[0] - a[0]));
        setEntries(sorted);
      })
      .catch(() => setError("Failed to load audit log."))
      .finally(() => setLoading(false));
  }, [isOpen, actor]);

  if (!isOpen) return null;

  return (
    <div
      data-ocid="audit.panel"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,5,15,0.72)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      tabIndex={-1}
    >
      <div
        style={{
          width: "min(520px, calc(100vw - 32px))",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          background: "rgba(2,10,22,0.95)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: `1px solid ${BORDER}`,
          borderRadius: 14,
          boxShadow:
            "0 0 48px rgba(0,255,204,0.10), 0 8px 48px rgba(0,0,0,0.6)",
          overflow: "hidden",
        }}
      >
        {/* Scanline */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,204,0.012) 2px, rgba(0,255,204,0.012) 4px)",
            borderRadius: 14,
          }}
        />

        {/* Header */}
        <div
          style={{
            padding: "14px 16px",
            borderBottom: `1px solid ${BORDER}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            background: "rgba(0,255,204,0.04)",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 3,
                height: 18,
                background: CYAN,
                borderRadius: 2,
                boxShadow: `0 0 8px ${CYAN}`,
              }}
            />
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 900,
                  color: CYAN,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                  textShadow: `0 0 10px ${CYAN}`,
                }}
              >
                Audit Log
              </div>
              <div style={{ fontSize: 8, color: TEXT_DIM, letterSpacing: 1 }}>
                On-chain tamperproof record
              </div>
            </div>
          </div>
          <button
            type="button"
            data-ocid="audit.close_button"
            onClick={onClose}
            aria-label="Close audit log"
            style={{
              width: 30,
              height: 30,
              borderRadius: 6,
              background: "rgba(0,255,204,0.06)",
              border: `1px solid ${BORDER}`,
              color: CYAN_DIM,
              cursor: "pointer",
              fontSize: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            overflowY: "auto",
            padding: "12px 14px",
            flex: 1,
            position: "relative",
            zIndex: 1,
          }}
        >
          {loading && (
            <div
              data-ocid="audit.loading_state"
              style={{
                textAlign: "center",
                padding: "32px 0",
                color: CYAN_DIM,
                fontSize: 10,
                letterSpacing: 2,
              }}
            >
              <div style={{ marginBottom: 8, fontSize: 20 }}>⏳</div>
              LOADING...
            </div>
          )}

          {error && (
            <div
              data-ocid="audit.error_state"
              style={{
                textAlign: "center",
                padding: "24px 0",
                color: "#ef4444",
                fontSize: 9,
                letterSpacing: 1,
              }}
            >
              {error}
            </div>
          )}

          {!loading && !error && entries.length === 0 && (
            <div
              data-ocid="audit.empty_state"
              style={{
                textAlign: "center",
                padding: "40px 0",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div style={{ fontSize: 32, opacity: 0.4 }}>🔐</div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: CYAN_DIM,
                  letterSpacing: 2,
                }}
              >
                No actions recorded yet.
              </div>
              <div
                style={{
                  fontSize: 8,
                  color: TEXT_DIM,
                  maxWidth: 260,
                  lineHeight: 1.6,
                }}
              >
                Every plot purchase, upgrade, survey, and mission you complete
                will appear here — permanently on-chain.
              </div>
            </div>
          )}

          {!loading && !error && entries.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {entries.map(([idx, entry], i) => {
                const decisionColor =
                  DECISION_COLORS[entry.decision] ?? TEXT_DIM;
                const icon = ACTION_ICONS[entry.action] ?? "📋";
                const amountStr = fmtAmount(entry.amount, entry.action);
                return (
                  <div
                    key={String(idx)}
                    data-ocid={`audit.item.${i + 1}`}
                    style={{
                      background: "rgba(0,10,20,0.55)",
                      border: `1px solid ${BORDER}`,
                      borderLeft: `3px solid ${decisionColor}44`,
                      borderRadius: 8,
                      padding: "10px 12px",
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 18,
                        lineHeight: 1,
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      {icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                          marginBottom: 3,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: TEXT,
                            letterSpacing: 0.5,
                            fontFamily: "monospace",
                          }}
                        >
                          {entry.action}
                        </span>
                        <span
                          style={{
                            fontSize: 8,
                            fontWeight: 900,
                            color: decisionColor,
                            letterSpacing: 1.5,
                            textTransform: "uppercase",
                            padding: "1px 6px",
                            borderRadius: 3,
                            background: `${decisionColor}18`,
                            border: `1px solid ${decisionColor}44`,
                            flexShrink: 0,
                          }}
                        >
                          {entry.decision}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "4px 12px",
                          marginBottom: 4,
                        }}
                      >
                        {entry.plotId && (
                          <span style={{ fontSize: 8, color: TEXT_DIM }}>
                            Plot:{" "}
                            <span
                              style={{
                                color: CYAN,
                                fontFamily: "monospace",
                              }}
                            >
                              #{entry.plotId}
                            </span>
                          </span>
                        )}
                        {amountStr && (
                          <span style={{ fontSize: 8, color: TEXT_DIM }}>
                            Amount:{" "}
                            <span
                              style={{
                                color: CYAN,
                                fontFamily: "monospace",
                              }}
                            >
                              {amountStr}
                            </span>
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 7.5,
                            color: "rgba(224,244,255,0.3)",
                            letterSpacing: 0.5,
                          }}
                        >
                          {entry.details}
                        </span>
                        <span
                          style={{
                            fontSize: 7,
                            color: TEXT_DIM,
                            fontFamily: "monospace",
                            letterSpacing: 0.5,
                            flexShrink: 0,
                          }}
                        >
                          {fmtTimestamp(entry.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer count */}
        {!loading && entries.length > 0 && (
          <div
            style={{
              padding: "8px 16px",
              borderTop: `1px solid ${BORDER}`,
              flexShrink: 0,
              textAlign: "right",
              fontSize: 8,
              color: TEXT_DIM,
              letterSpacing: 1,
              background: "rgba(0,255,204,0.02)",
            }}
          >
            {entries.length} record{entries.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
