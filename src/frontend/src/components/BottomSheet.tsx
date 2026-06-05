import { ChevronDown, X } from "lucide-react";
import type React from "react";
import { useEffect, useRef } from "react";

const CYAN = "#00ffcc";
const BORDER = "rgba(0,255,204,0.22)";
const CYAN_DIM = "rgba(0,255,204,0.35)";

interface BottomSheetProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Height as CSS value, e.g. "70vh" */
  height?: string;
}

export default function BottomSheet({
  isOpen,
  title,
  onClose,
  children,
  height = "70vh",
}: BottomSheetProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset scroll when opening a new tab
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop close
        <div
          data-ocid="bottom_sheet.backdrop"
          onClick={onClose}
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.55)" }}
        />
      )}

      {/* Sheet */}
      <div
        data-ocid="bottom_sheet.panel"
        className="fixed left-0 right-0 z-50 flex flex-col"
        style={{
          bottom: 64,
          height,
          background: "rgba(4,12,24,0.97)",
          borderTop: `1px solid ${BORDER}`,
          borderLeft: `1px solid ${BORDER}`,
          borderRight: `1px solid ${BORDER}`,
          borderRadius: "16px 16px 0 0",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow: "0 -8px 48px rgba(0,255,204,0.08)",
          transform: isOpen ? "translateY(0)" : "translateY(105%)",
          transition: "transform 0.35s cubic-bezier(0.16,1,0.3,1)",
          pointerEvents: isOpen ? "auto" : "none",
        }}
      >
        {/* Handle + header */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-4 py-2.5"
          style={{
            borderBottom: `1px solid ${BORDER}`,
            background: "rgba(0,255,204,0.03)",
          }}
        >
          {/* Drag handle */}
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{ top: 8 }}
          >
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                background: "rgba(0,255,204,0.25)",
              }}
            />
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: CYAN,
              letterSpacing: 2,
              textShadow: `0 0 10px ${CYAN}`,
              paddingTop: 4,
            }}
          >
            {title}
          </span>
          <div className="flex items-center gap-1" style={{ paddingTop: 4 }}>
            <button
              type="button"
              data-ocid="bottom_sheet.close_button"
              onClick={onClose}
              aria-label="Close panel"
              className="cursor-pointer flex items-center justify-center rounded"
              style={{
                background: "none",
                border: "none",
                color: CYAN_DIM,
                padding: 4,
              }}
            >
              <ChevronDown size={18} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close panel"
              className="cursor-pointer flex items-center justify-center rounded"
              style={{
                background: "rgba(0,255,204,0.06)",
                border: `1px solid ${BORDER}`,
                color: CYAN_DIM,
                padding: 4,
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  );
}
