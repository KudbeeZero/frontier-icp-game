// Stable-storage mixin — exposes getGlobalStats and resetTestState public endpoints.
// Receives all required state slices as mixin parameters.
import StableTypes "../types/stable-storage";
import StableLib "../lib/stable-storage";

mixin (
  statsState     : { var totalFRNTRBurned : Nat; var totalFRNTRMined : Nat; var activePlayers : Nat },
  plotSoldState  : { var count : Nat },
  adminState     : { var adminPrincipal : Text },
) {

  /// Returns a live snapshot of global game economy metrics.
  /// All values are computed from current canister state.
  public query func getGlobalStats() : async StableTypes.GlobalStats {
    // Base FRNTR/day per owned plot (7) × plots sold gives a lower-bound
    // emission rate; the mixin does not receive per-plot tiers so we use
    // the canonical base rate of 7 FRNTR/day per plot.
    let BASE_RATE_PER_PLOT : Nat = 7;
    let PRE_MINTED         : Nat = 5_000_000_000;
    let dailyRate          : Nat = plotSoldState.count * BASE_RATE_PER_PLOT;
    StableLib.computeGlobalStats(
      plotSoldState.count,
      statsState.totalFRNTRBurned,
      statsState.totalFRNTRMined,
      statsState.activePlayers,
      dailyRate,
      PRE_MINTED,
    );
  };

  /// Admin-only: wipe all player data, plot ownership, and leaderboard state.
  /// Intended for testnet cleanup before mainnet launch.
  public shared ({ caller }) func resetTestState() : async StableTypes.ResetResult {
    if (not StableLib.isAuthorisedAdmin(caller.toText(), adminState.adminPrincipal)) {
      return #err("Unauthorized: caller is not the admin");
    };
    // Reset tracked counters accessible via injected state slices.
    // Plot and player maps are owned by main.mo and not injected here;
    // a full data wipe requires the game-api mixin or main.mo logic.
    statsState.totalFRNTRBurned  := 0;
    statsState.totalFRNTRMined   := 0;
    statsState.activePlayers     := 0;
    plotSoldState.count          := 0;
    #ok("Test state reset: counters cleared. Call resetPlots() and resetPlayers() on the game canister to wipe plot and player maps.");
  };
};
