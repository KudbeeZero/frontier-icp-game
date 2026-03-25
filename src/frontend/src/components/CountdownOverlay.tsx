import { useEffect, useRef, useState } from "react";

interface CountdownOverlayProps {
  onLaunchReady: () => void;
}

const STEPS = ["3", "2", "1", "LAUNCH"];

export default function CountdownOverlay({
  onLaunchReady,
}: CountdownOverlayProps) {
  const [step, setStep] = useState(0);
  const calledRef = useRef(false);

  useEffect(() => {
    calledRef.current = false;
    setStep(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    STEPS.forEach((_, i) => {
      timers.push(
        setTimeout(() => {
          setStep(i);
        }, i * 800),
      );
    });
    timers.push(
      setTimeout(
        () => {
          if (!calledRef.current) {
            calledRef.current = true;
            onLaunchReady();
          }
        },
        STEPS.length * 800 + 200,
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, [onLaunchReady]);

  const isLaunch = step === 3;

  return (
    <div
      data-ocid="countdown.modal"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        pointerEvents: "all",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        {/* Warning label */}
        <div
          style={{
            fontSize: 10,
            letterSpacing: 4,
            color: "rgba(0,255,204,0.6)",
            fontFamily: "'Courier New', monospace",
            textTransform: "uppercase",
          }}
        >
          ICBM LAUNCH SEQUENCE INITIATED
        </div>

        {/* Main number */}
        <div
          key={step}
          style={{
            fontFamily: "'Courier New', monospace",
            fontWeight: 900,
            fontSize: isLaunch ? 52 : 120,
            color: isLaunch ? "#ff4400" : "#00ffcc",
            textShadow: isLaunch
              ? "0 0 40px #ff4400, 0 0 80px #ff220055"
              : "0 0 40px #00ffcc, 0 0 80px #00ffcc44",
            letterSpacing: isLaunch ? 8 : 0,
            lineHeight: 1,
            animation: "cdPulse 0.4s ease-out",
            userSelect: "none",
          }}
        >
          {STEPS[step]}
        </div>

        {/* Scan line decoration */}
        <div
          style={{
            width: 200,
            height: 1,
            background:
              "linear-gradient(90deg, transparent, rgba(0,255,204,0.6), transparent)",
            animation: "scanLine 0.8s ease-in-out infinite",
          }}
        />

        {/* Target info */}
        <div
          style={{
            fontSize: 9,
            letterSpacing: 2,
            color: "rgba(255,100,0,0.7)",
            fontFamily: "'Courier New', monospace",
          }}
        >
          TARGET: LOCKED · TRAJECTORY: COMPUTED
        </div>
      </div>

      <style>{`
        @keyframes cdPulse {
          0% { transform: scale(1.4); opacity: 0; }
          60% { transform: scale(0.95); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes scanLine {
          0%,100% { opacity: 0.3; transform: scaleX(0.4); }
          50% { opacity: 1; transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
}
