import { useGameStore } from "../store/gameStore";
/**
 * FaucetButton — thin wrapper around FaucetOverlay.
 *
 * Reads `testnetMode` from the game store.
 * Returns null (renders nothing) when testnet mode is disabled,
 * so the faucet UI is completely absent on mainnet.
 */
import FaucetOverlay from "./FaucetOverlay";

export default function FaucetButton() {
  const testnetMode = useGameStore((s) => s.testnetMode);
  if (!testnetMode) return null;
  return <FaucetOverlay />;
}
