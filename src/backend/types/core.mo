// Core cross-cutting stats and tokenomics types for Frontier: Missile Horizon.
import Debug "mo:core/Debug";

module {
  /// Snapshot of global game economy stats — returned by getGlobalStats.
  /// Field names are intentionally short for clean frontend binding.
  public type GlobalStats = {
    circulatingSupply : Nat;   // FRNTR currently in circulation (pre-minted minus burned, plus mined)
    totalBurned       : Nat;   // total FRNTR removed from supply
    totalPlotsOwned   : Nat;   // plots owned across all players
    activePlayers     : Nat;   // number of distinct players with at least one interaction
    dailyEmission     : Nat;   // current FRNTR emitted per day across all plots
  };

  /// Full tokenomics snapshot — returned by getTokenomics.
  public type Tokenomics = {
    maxSupply          : Nat;   // hard cap: 10_000_000_000 FRNTR
    circulatingSupply  : Nat;   // pre-minted (5B) + mined - burned
    totalBurned        : Nat;   // total burned from circulation
    emissionRate       : Nat;   // FRNTR per day at current plot count
    burnRate           : Nat;   // approximate FRNTR burned per day (purchase fees + combat)
    remainingMineable  : Nat;   // 5B mineable cap minus total mined so far
    daysUntilMilestone : Nat;   // days until next 500M supply milestone
  };

  /// Single generator tier definition — returned in tier catalog queries.
  public type GeneratorTierInfo = {
    tierIndex   : Nat;       // 0 = None, 1-6 = TierI-TierVI
    name        : Text;
    bonusPerDay : Float;     // additional FRNTR per day on top of base 7
    costFRNTR   : Nat;
  };

  /// Per-plot production rate summary returned by getPlotProductionRate.
  public type PlotProductionRate = {
    plotId         : Nat;
    baseFRNTRPerDay : Float;   // always 7.0
    tierBonus      : Float;    // from generator tier (0 if no upgrade)
    nexusBonus     : Float;    // from nexus electricity level
    totalPerDay    : Float;    // baseFRNTRPerDay + tierBonus + nexusBonus
    generatorTier  : Nat;      // 0–6
  };
};
