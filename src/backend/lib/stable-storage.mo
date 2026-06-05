// Stable-storage domain logic for Frontier: Missile Horizon.
// Computes global stats from injected state slices and validates resets.
import StableTypes "stable-storage";

module {

  /// Compute the GlobalStats record from live state.
  /// Parameters are passed in from main.mo so this module is stateless.
  ///
  /// plotsOwned   : number of plots that have an owner
  /// totalBurned  : accumulated FRNTR burned across all transactions
  /// totalMined   : accumulated FRNTR mined across all transactions
  /// activePlayers: number of distinct players who have ever interacted
  /// dailyRate    : sum of all per-plot FRNTR/day rates
  /// preMinted    : canonical pre-minted supply (5_000_000_000)
  public func computeGlobalStats(
    plotsOwned    : Nat,
    totalBurned   : Nat,
    totalMined    : Nat,
    activePlayers : Nat,
    dailyRate     : Nat,
    preMinted     : Nat,
  ) : StableTypes.GlobalStats {
    // FRNTR in circulation = pre-minted supply + mined - burned
    let inCirculation : Nat = if (preMinted + totalMined >= totalBurned) {
      preMinted + totalMined - totalBurned
    } else { 0 };
    {
      totalPlotsOwnedAcrossAllPlayers = plotsOwned;
      totalFRNTRInCirculation          = inCirculation;
      totalFRNTRBurned                 = totalBurned;
      totalFRNTRMined                  = totalMined;
      activePlayerCount                = activePlayers;
      currentDailyEmissionRate         = dailyRate;
    };
  };

  /// Validate that the caller is authorised to perform a testnet reset.
  /// Returns true if authorised, false otherwise.
  public func isAuthorisedAdmin(callerText : Text, adminText : Text) : Bool {
    callerText == adminText;
  };
};
