import { FlaskConical } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGameStore } from "../store/gameStore";

const CYAN = "#00ffcc";
const BORDER = "rgba(0,255,204,0.22)";
const TEXT_DIM = "rgba(224,244,255,0.45)";

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
const STORAGE_KEY = "faucet_last_used";

export default function FaucetButton() {
  const mintTestTokens = useGameStore((s) => s.mintTestTokens);
  const [toast, setToast] = useState<string | null>(null);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateCooldown = useCallback(() => {
    const last = Number(localStorage.getItem(STORAGE_KEY) ?? 0);
    const elapsed = Date.now() - last;
    setCooldownLeft(Math.max(0, COOLDOWN_MS - elapsed));
  }, []);

  useEffect(() => {
    updateCooldown();
    timerRef.current = setInterval(updateCooldown, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [updateCooldown]);

  const formatCooldown = (ms: number): string => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${h}h ${m}m ${s}s`;
  };

  const handleFaucet = () => {
    if (cooldownLeft > 0) return;
    mintTestTokens();
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    updateCooldown();
    setToast("+500 FRNTR & +2 ICP (test) added!");
    setTimeout(() => setToast(null), 4000);
  };

  const onCooldown = cooldownLeft > 0;

  return (
    <>
      <button
        type="button"
        data-ocid="faucet.button"
        onClick={handleFaucet}
        disabled={onCooldown}
        title={
          onCooldown
            ? `Cooldown: ${formatCooldown(cooldownLeft)}`
            : "Claim test tokens"
        }
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "5px 10px",
          borderRadius: 6,
          background: onCooldown
            ? "rgba(0,255,204,0.03)"
            : "rgba(0,255,204,0.1)",
          border: `1px solid ${onCooldown ? "rgba(0,255,204,0.1)" : BORDER}`,
          color: onCooldown ? TEXT_DIM : CYAN,
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 1.5,
          cursor: onCooldown ? "not-allowed" : "pointer",
          opacity: onCooldown ? 0.6 : 1,
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        <FlaskConical size={11} />
        {onCooldown
          ? `FAUCET (${formatCooldown(cooldownLeft)})`
          : "TESTNET FAUCET"}
      </button>

      {toast && (
        <div
          data-ocid="faucet.success_state"
          style={{
            position: "fixed",
            top: 60,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            background: "rgba(4,12,24,0.97)",
            backdropFilter: "blur(12px)",
            border: `1px solid ${BORDER}`,
            borderTop: `2px solid ${CYAN}`,
            borderRadius: 8,
            padding: "10px 18px",
            fontSize: 10,
            fontWeight: 700,
            color: CYAN,
            letterSpacing: 1.5,
            whiteSpace: "nowrap",
            boxShadow: "0 4px 20px rgba(0,255,204,0.15)",
          }}
        >
          ✓ {toast}
        </div>
      )}
    </>
  );
}
