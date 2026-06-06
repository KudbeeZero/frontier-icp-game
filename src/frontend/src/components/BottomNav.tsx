import {
  Globe,
  LayoutDashboard,
  Map as MapIcon,
  Package,
  Radio,
  Shield,
  Trophy,
} from "lucide-react";
import { useGameStore } from "../store/gameStore";

const CYAN = "#00ffcc";
const CYAN_DIM = "rgba(0,255,204,0.35)";
const BORDER_TOP = "rgba(0,255,204,0.28)";

const BASE_NAV_ITEMS = [
  { id: "map", label: "MAP", Icon: MapIcon },
  { id: "command", label: "CMD", Icon: LayoutDashboard },
  { id: "intel", label: "INTEL", Icon: Radio },
  { id: "universe", label: "UNI", Icon: Globe },
  { id: "leaderboard", label: "LEAD", Icon: Trophy },
  { id: "inventory", label: "INV", Icon: Package },
] as const;

const ADMIN_NAV_ITEM = { id: "admin" as const, label: "ADMIN", Icon: Shield };

export const NAV_ITEMS = BASE_NAV_ITEMS;

export type BottomNavTab =
  | (typeof BASE_NAV_ITEMS)[number]["id"]
  | typeof ADMIN_NAV_ITEM.id;

interface BottomNavProps {
  activeTab: BottomNavTab | null;
  onTabClick: (id: BottomNavTab) => void;
}

export default function BottomNav({ activeTab, onTabClick }: BottomNavProps) {
  const isAdmin = useGameStore((s) => s.player.isAdmin);
  const visibleItems: {
    id: BottomNavTab;
    label: string;
    Icon: React.ElementType<{
      size?: number;
      color?: string;
      style?: React.CSSProperties;
    }>;
  }[] = [...BASE_NAV_ITEMS, ...(isAdmin ? [ADMIN_NAV_ITEM] : [])];

  return (
    <div
      data-ocid="bottom_nav.panel"
      className="fixed left-0 right-0 z-50 flex items-stretch"
      style={{
        bottom: 0,
        height: 64,
        background: "rgba(2,10,20,0.97)",
        borderTop: `1px solid ${BORDER_TOP}`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {visibleItems.map(({ id, label, Icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            type="button"
            key={id}
            data-ocid={`bottom_nav.${id}.tab`}
            onClick={() => onTabClick(id)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all duration-150"
            style={{
              background: isActive ? "rgba(0,255,204,0.07)" : "transparent",
              borderTop: isActive
                ? `2px solid ${CYAN}`
                : "2px solid transparent",
              position: "relative",
            }}
          >
            {isActive && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "20%",
                  right: "20%",
                  height: 2,
                  background: CYAN,
                  borderRadius: "0 0 2px 2px",
                  boxShadow: `0 0 8px ${CYAN}`,
                  filter: "blur(1px)",
                }}
              />
            )}
            <Icon
              size={18}
              color={
                isActive
                  ? CYAN
                  : id === "admin"
                    ? "rgba(255,100,100,0.6)"
                    : CYAN_DIM
              }
              style={{
                filter: isActive ? `drop-shadow(0 0 4px ${CYAN})` : "none",
                transition: "filter 0.15s",
              }}
            />
            <span
              style={{
                fontSize: 7.5,
                letterSpacing: 0.5,
                color: isActive ? CYAN : CYAN_DIM,
                fontWeight: isActive ? 700 : 400,
              }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export { BASE_NAV_ITEMS };
