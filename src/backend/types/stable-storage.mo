// Stable-storage domain types for Frontier: Missile Horizon.
// Covers global stats view and testnet reset result types.
module {

  /// Snapshot of global game economy — returned by getGlobalStats().
  public type GlobalStats = {
    totalPlotsOwnedAcrossAllPlayers : Nat;
    totalFRNTRInCirculation          : Nat;
    totalFRNTRBurned                 : Nat;
    totalFRNTRMined                  : Nat;
    activePlayerCount                : Nat;
    currentDailyEmissionRate         : Nat;   // FRNTR/day across all owned plots
  };

  /// Result of an admin testnet state reset.
  public type ResetResult = {
    #ok : Text;
    #err : Text;
  };

  /// Point-in-time snapshot of the global game economy.
  /// Captured daily via heartbeat and on every canister upgrade.
  public type EconomySnapshot = {
    timestamp            : Int;   // Time.now() nanoseconds
    totalPlotsOwned      : Nat;
    totalFRNTRBurned     : Nat;
    totalFRNTRMined      : Nat;
    activePlayers        : Nat;
    globalDailyOutput    : Nat;   // FRNTR/day across all owned plots
    totalUnclaimedFRNTR  : Nat;   // approximate global unclaimed accumulation
    treasuryDev          : Nat;   // ICP e8s
    treasuryLeaderboard  : Nat;   // ICP e8s
    treasuryLiquidity    : Nat;   // ICP e8s
    trigger              : Text;  // "daily", "canister_upgrade", "event"
  };
};
