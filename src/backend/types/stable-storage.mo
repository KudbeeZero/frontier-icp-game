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
};
