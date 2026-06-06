import type React from "react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const CYAN = "#00ffcc";
const GOLD = "#ffd700";
const BG = "rgba(0,10,20,0.92)";
const BORDER = "rgba(0,255,204,0.28)";
const TEXT = "#e0f4ff";
const TEXT_DIM = "rgba(224,244,255,0.55)";
const ACTION_COLORS: Record<string, string> = {
  purchase: CYAN,
  upgrade: GOLD,
  claim: "#22c55e",
  survey: "#a78bfa",
  mission: GOLD,
};
const ACTION_LABELS: Record<string, string> = {
  purchase: "CONFIRM PURCHASE",
  upgrade: "CONFIRM UPGRADE",
  claim: "CONFIRM CLAIM",
  survey: "CONFIRM SURVEY",
  mission: "CLAIM MISSION REWARD",
};

export interface ConfirmDetail {
  label: string;
  value: string;
}

// ActionDetail is an alias used by PlotInfoPanel/MissionsTab callers
export interface ActionDetail {
  label: string;
  value: string;
}

interface ActionConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  actionType: "purchase" | "upgrade" | "claim" | "survey" | "mission";
  details?: ConfirmDetail[];
  costLabel?: string;
  warningText?: string;
  isLoading?: boolean;
}

// Named export alias so callers can use either import style
export function ActionConfirmModal(props: ActionConfirmModalProps) {
  return _ActionConfirmModal(props);
}

export default function _ActionConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  title,
  actionType,
  details,
  costLabel,
  warningText,
  isLoading = false,
}: ActionConfirmModalProps) {
  const overlayRef = useRef<HTMLDialogElement>(null);

  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const accentColor = ACTION_COLORS[actionType] ?? CYAN;
  const headerLabel = ACTION_LABELS[actionType] ?? "CONFIRM ACTION";

  const modal = (
    <dialog
      ref={overlayRef}
      data-ocid="action_confirm.dialog"
      aria-labelledby="action-confirm-title"
      onClick={(e: React.MouseEvent) => {
        if (e.target === overlayRef.current) onCancel();
      }}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === "Escape") onCancel();
      }}
      open
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        padding: 16,
        border: "none",
        margin: 0,
        maxWidth: "100vw",
        maxHeight: "100vh",
        width: "100%",
        height: "100%",
        overflow: "visible",
      }}
    >
      <div
        style={{
          background: BG,
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: `1px solid ${BORDER}`,
          boxShadow: `0 0 40px ${accentColor}22, 0 0 80px rgba(0,0,0,0.6), inset 0 0 30px rgba(0,255,204,0.03)`,
          borderRadius: 14,
          width: "100%",
          maxWidth: 400,
          overflow: "hidden",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e: React.KeyboardEvent) => e.stopPropagation()}
      >
        {/* Top accent line */}
        <div
          style={{
            height: 2,
            background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
          }}
        />

        {/* Scan-line overlay */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,255,255,0.015) 3px,rgba(0,255,255,0.015) 4px)",
            pointerEvents: "none",
            borderRadius: 14,
          }}
        />

        <div style={{ padding: "18px 20px 20px", position: "relative" }}>
          {/* Header */}
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: 3,
                color: accentColor,
                textTransform: "uppercase",
                marginBottom: 4,
                fontFamily: "monospace",
                textShadow: `0 0 8px ${accentColor}88`,
              }}
            >
              {headerLabel}
            </div>
            <div
              id="action-confirm-title"
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: TEXT,
                letterSpacing: 0.5,
                lineHeight: 1.2,
              }}
            >
              {title}
            </div>
          </div>

          {/* Details grid */}
          {(details ?? []).length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "6px 12px",
                padding: "10px 12px",
                background: "rgba(0,255,204,0.03)",
                border: `1px solid ${BORDER}`,
                borderRadius: 8,
                marginBottom: 12,
              }}
            >
              {(details ?? []).map((d) => (
                <div key={d.label}>
                  <div
                    style={{
                      fontSize: 7,
                      color: TEXT_DIM,
                      letterSpacing: 1,
                      textTransform: "uppercase",
                      fontFamily: "monospace",
                      marginBottom: 1,
                    }}
                  >
                    {d.label}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: TEXT,
                      fontFamily: "monospace",
                      wordBreak: "break-all",
                    }}
                  >
                    {d.value}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Cost */}
          {costLabel && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                background: `${accentColor}0a`,
                border: `1px solid ${accentColor}33`,
                borderRadius: 8,
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  fontSize: 8,
                  color: TEXT_DIM,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  fontFamily: "monospace",
                }}
              >
                COST
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 900,
                  color: accentColor,
                  fontFamily: "monospace",
                  textShadow: `0 0 10px ${accentColor}66`,
                }}
              >
                {costLabel}
              </span>
            </div>
          )}

          {/* Warning */}
          <div
            style={{
              padding: "8px 10px",
              background: "rgba(239,68,68,0.07)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: 7,
              marginBottom: 16,
              fontSize: 8,
              color: "rgba(252,165,165,0.85)",
              lineHeight: 1.6,
              letterSpacing: 0.3,
            }}
          >
            <span style={{ marginRight: 4 }}>⚠</span>
            {warningText}
          </div>

          {/* On-chain notice */}
          <div
            style={{
              fontSize: 7,
              color: "rgba(252,165,165,0.6)",
              letterSpacing: 0.5,
              textAlign: "center",
              marginBottom: 16,
              fontFamily: "monospace",
            }}
          >
            THIS ACTION CANNOT BE UNDONE. IT WILL BE PERMANENTLY RECORDED
            ON-CHAIN.
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              data-ocid="action_confirm.cancel_button"
              onClick={onCancel}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: "10px 0",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8,
                color: isLoading ? "rgba(255,255,255,0.3)" : TEXT_DIM,
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 1.5,
                cursor: isLoading ? "not-allowed" : "pointer",
                textTransform: "uppercase",
                transition: "all 0.15s",
              }}
            >
              CANCEL
            </button>
            <button
              type="button"
              data-ocid="action_confirm.confirm_button"
              onClick={onConfirm}
              disabled={isLoading}
              style={{
                flex: 2,
                padding: "10px 0",
                background: isLoading ? `${accentColor}18` : `${accentColor}22`,
                border: `1px solid ${isLoading ? `${accentColor}44` : `${accentColor}88`}`,
                borderRadius: 8,
                color: isLoading ? `${accentColor}66` : accentColor,
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 1.5,
                cursor: isLoading ? "not-allowed" : "pointer",
                textTransform: "uppercase",
                boxShadow: isLoading ? "none" : `0 0 12px ${accentColor}33`,
                transition: "all 0.15s",
              }}
            >
              {isLoading ? "PROCESSING..." : "CONFIRM"}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );

  return createPortal(modal, document.body);
}
