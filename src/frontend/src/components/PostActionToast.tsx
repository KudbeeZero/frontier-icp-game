import { useEffect, useRef, useState } from "react";

const CYAN = "#00ffcc";
const _TEXT = "#e0f4ff";
const TEXT_DIM = "rgba(224,244,255,0.55)";
const SHOWN_KEY = "shown_toasts";

export type PostActionType =
  | "purchase"
  | "upgrade"
  | "claim"
  | "survey"
  | "mission";

const MESSAGES: Record<PostActionType, string> = {
  purchase: "Plot acquired! View your new land.",
  upgrade: "Generator upgraded! Production increased.",
  claim: "Tokens claimed to your wallet.",
  survey: "Survey started! Results will be ready soon.",
  mission: "Mission complete! Reward minted to your wallet.",
};

const ICONS: Record<PostActionType, string> = {
  purchase: "🌍",
  upgrade: "⚡",
  claim: "💰",
  survey: "🔭",
  mission: "🏆",
};

function getShownToasts(): PostActionType[] {
  try {
    const raw = sessionStorage.getItem(SHOWN_KEY);
    return raw ? (JSON.parse(raw) as PostActionType[]) : [];
  } catch {
    return [];
  }
}

function markToastShown(type: PostActionType) {
  try {
    const shown = getShownToasts();
    if (!shown.includes(type)) {
      sessionStorage.setItem(SHOWN_KEY, JSON.stringify([...shown, type]));
    }
  } catch {
    // ignore
  }
}

interface PostActionToastProps {
  actionType: PostActionType | null;
  onNavigate: (tab: "inventory" | "balance" | "leaderboard") => void;
  onDismiss: () => void;
}

// Extended props interface for callers that provide message + onClose + generic tab string
export interface PostActionToastExtProps {
  actionType: string;
  message: string;
  onNavigate: (tab: string) => void;
  onClose: () => void;
}

// Named export for callers using the extended props interface
export function PostActionToast({
  actionType,
  message,
  onNavigate,
  onClose,
}: PostActionToastExtProps) {
  const safeType =
    (actionType as PostActionType) in MESSAGES
      ? (actionType as PostActionType)
      : "claim";
  return (
    <_PostActionToast
      actionType={safeType}
      customMessage={message}
      onNavigate={(tab) => onNavigate(tab)}
      onDismiss={onClose}
    />
  );
}

export default function _PostActionToast({
  actionType,
  customMessage,
  onNavigate,
  onDismiss,
}: PostActionToastProps & { customMessage?: string }) {
  const [visible, setVisible] = useState(false);
  const [sliding, setSliding] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);

  // Inject keyframes once
  useEffect(() => {
    const id = "post-action-toast-kf";
    if (!document.getElementById(id)) {
      const el = document.createElement("style");
      el.id = id;
      el.textContent = [
        "@keyframes slideInFromRight {",
        "  from { transform: translateX(110%); opacity: 0; }",
        "  to   { transform: translateX(0);    opacity: 1; }",
        "}",
        "@keyframes slideOutToRight {",
        "  from { transform: translateX(0);    opacity: 1; }",
        "  to   { transform: translateX(110%); opacity: 0; }",
        "}",
      ].join("\n");
      document.head.appendChild(el);
    }
  }, []);

  useEffect(() => {
    if (!actionType) return;
    const shown = getShownToasts();
    if (shown.includes(actionType)) return;
    // Small delay so it doesn't appear simultaneously with the success toast
    const showDelay = setTimeout(() => {
      markToastShown(actionType);
      setSliding(false);
      setVisible(true);
      mountedRef.current = true;
      timerRef.current = setTimeout(() => {
        dismiss();
      }, 8000);
    }, 600);
    return () => clearTimeout(showDelay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionType]);

  function dismiss() {
    setSliding(true);
    setTimeout(() => {
      setVisible(false);
      setSliding(false);
      onDismiss();
    }, 350);
  }

  function handleNav(tab: "inventory" | "balance" | "leaderboard") {
    if (timerRef.current) clearTimeout(timerRef.current);
    onNavigate(tab);
    dismiss();
  }

  if (!visible && !sliding) return null;

  const msg = customMessage ?? (actionType ? MESSAGES[actionType] : "");
  const icon = actionType ? ICONS[actionType] : "✓";

  return (
    <output
      data-ocid="post_action.toast"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: 72,
        right: 14,
        zIndex: 9000,
        width: 290,
        background: "rgba(0,10,22,0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: `1px solid ${CYAN}44`,
        borderLeft: `3px solid ${CYAN}`,
        borderRadius: 10,
        boxShadow: `0 0 24px ${CYAN}18, 0 4px 32px rgba(0,0,0,0.55)`,
        animation: sliding
          ? "slideOutToRight 0.35s cubic-bezier(0.4,0,1,1) forwards"
          : "slideInFromRight 0.38s cubic-bezier(0.22,1,0.36,1) forwards",
        overflow: "hidden",
      }}
    >
      {/* Top glow bar */}
      <div
        style={{
          height: 1,
          background: `linear-gradient(90deg, ${CYAN}, transparent)`,
        }}
      />

      <div style={{ padding: "12px 14px 10px" }}>
        {/* Header row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 16 }}>{icon}</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: CYAN,
                letterSpacing: 0.5,
              }}
            >
              {msg}
            </span>
          </div>
          <button
            type="button"
            data-ocid="post_action.close_button"
            onClick={dismiss}
            aria-label="Dismiss notification"
            style={{
              background: "transparent",
              border: "none",
              color: TEXT_DIM,
              fontSize: 14,
              cursor: "pointer",
              lineHeight: 1,
              padding: "0 2px",
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Quick nav buttons */}
        <div
          style={{
            display: "flex",
            gap: 5,
            marginTop: 4,
          }}
        >
          <button
            type="button"
            data-ocid="post_action.inventory_button"
            onClick={() => handleNav("inventory")}
            style={{
              flex: 1,
              padding: "5px 4px",
              background: "rgba(0,255,204,0.07)",
              border: `1px solid ${CYAN}33`,
              borderRadius: 6,
              color: CYAN,
              fontSize: 7.5,
              fontWeight: 700,
              letterSpacing: 0.8,
              cursor: "pointer",
              textTransform: "uppercase",
              transition: "all 0.15s",
            }}
          >
            Inventory
          </button>
          <button
            type="button"
            data-ocid="post_action.balance_button"
            onClick={() => handleNav("balance")}
            style={{
              flex: 1,
              padding: "5px 4px",
              background: "rgba(0,255,204,0.07)",
              border: `1px solid ${CYAN}33`,
              borderRadius: 6,
              color: CYAN,
              fontSize: 7.5,
              fontWeight: 700,
              letterSpacing: 0.8,
              cursor: "pointer",
              textTransform: "uppercase",
              transition: "all 0.15s",
            }}
          >
            Balance
          </button>
          <button
            type="button"
            data-ocid="post_action.leaderboard_button"
            onClick={() => handleNav("leaderboard")}
            style={{
              flex: 1,
              padding: "5px 4px",
              background: "rgba(0,255,204,0.07)",
              border: `1px solid ${CYAN}33`,
              borderRadius: 6,
              color: CYAN,
              fontSize: 7.5,
              fontWeight: 700,
              letterSpacing: 0.8,
              cursor: "pointer",
              textTransform: "uppercase",
              transition: "all 0.15s",
            }}
          >
            Leaderboard
          </button>
        </div>

        {/* Progress bar */}
        <div
          style={{
            marginTop: 8,
            height: 2,
            background: "rgba(0,255,204,0.12)",
            borderRadius: 1,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              background: CYAN,
              borderRadius: 1,
              animation: "toastProgress 8s linear forwards",
            }}
          />
        </div>
      </div>

      {/* Progress animation injected inline */}
      <style>
        {"@keyframes toastProgress { from { width: 100%; } to { width: 0%; } }"}
      </style>
    </output>
  );
}
