// Public API mixin for core stats and tokenomics endpoints.
// Exposes: getGlobalStats, getTokenomics, getPlotProductionRate.
import Debug      "mo:core/Debug";
import Map        "mo:core/Map";
import Principal  "mo:core/Principal";
import CoreTypes  "../types/core";
import GameTypes  "../types/game";
import CoreLib "../lib/core";

mixin (
  statsState  : { var totalFRNTRBurned : Nat; var totalFRNTRMined : Nat; var activePlayers : Nat },
  plotSoldState : { var count : Nat },
  generatorTiers : Map.Map<Text, GameTypes.GeneratorTier>,
  plots : Map.Map<Text, { plotId : Text; owner : ?Principal; nexusElectricityLevel : Nat; biome : Text; richness : Nat; lat : Float; lng : Float; iron : Nat; fuel : Nat; crystal : Nat; lastTick : Int; defenses : { turrets : Nat; shields : Nat; walls : Nat }; facilities : { electricityPlant : Bool; blockchainNode : Bool; dataCentre : Bool; aiLab : Bool }; attackCooldown : Int; faction : ?Text; morale : Nat; interceptorSystem : ?Text; purchaseTimestamp : ?Int; nftTokenId : ?Nat }>,
) {

  // ---------------------------------------------------------------------------
  // Global stats — UNIVERSE menu
  // ---------------------------------------------------------------------------

  /// Returns live global economy stats for the UNIVERSE panel.
  /// Field names match what the frontend expects: circulatingSupply, totalBurned,
  /// totalPlotsOwned, activePlayers, dailyEmission.
  /// Returns live global economy stats for the UNIVERSE panel.
  /// dailyEmission is computed accurately by summing each owned plot's tier rate.
  /// totalUnclaimedTokens defaults to 0 here — use getGameStats() for the full value
  /// (requires plotClaimTimes access not available in this mixin).
  /// totalPlayers mirrors activePlayers from statsState.
  public query func getGlobalStats() : async CoreTypes.GlobalStats {
    // Compute real daily emission: iterate all owned plots, look up each plot's generator tier.
    var realDailyEmission : Nat = 0;
    for ((pid, plot) in plots.entries()) {
      switch (plot.owner) {
        case (null) {};
        case (?_) {
          let tierIndex : Nat = switch (generatorTiers.get(pid)) {
            case (null)      { 0 };
            case (?#None)    { 0 };
            case (?#TierI)   { 1 };
            case (?#TierII)  { 2 };
            case (?#TierIII) { 3 };
            case (?#TierIV)  { 4 };
            case (?#TierV)   { 5 };
            case (?#TierVI)  { 6 };
          };
          // dailyRateFromTierIndex returns Float; convert to Nat (truncate)
          let rate : Nat = switch (tierIndex) {
            case (0) { 7  };
            case (1) { 9  };
            case (2) { 12 };
            case (3) { 17 };
            case (4) { 25 };
            case (5) { 37 };
            case (6) { 55 };
            case (_) { 7  };
          };
          realDailyEmission += rate;
        };
      };
    };
    CoreLib.buildGlobalStats(
      plotSoldState.count,
      statsState.totalFRNTRBurned,
      statsState.totalFRNTRMined,
      statsState.activePlayers,
      realDailyEmission,
      0,  // totalUnclaimedTokens: use getGameStats() for the accurate value
      statsState.activePlayers,  // totalPlayers: proxy from activePlayers
    );
  };

  // ---------------------------------------------------------------------------
  // Tokenomics — UNIVERSE menu extended view
  // ---------------------------------------------------------------------------

  /// Returns a full tokenomics snapshot with supply, burn, emission,
  /// remainingMineable, and milestone projection.
  /// Field names: maxSupply, circulatingSupply, totalBurned, emissionRate,
  /// burnRate, remainingMineable, daysUntilMilestone.
  public query func getTokenomics() : async CoreTypes.Tokenomics {
    CoreLib.buildTokenomics(
      statsState.totalFRNTRBurned,
      statsState.totalFRNTRMined,
      plotSoldState.count * 7,
      plotSoldState.count,
    );
  };

  // ---------------------------------------------------------------------------
  // Per-plot production rate
  // ---------------------------------------------------------------------------

  /// Returns the current FRNTR/day breakdown for a single plot.
  /// Uses the canonical lookup table: base 7 + tier bonus [2,5,10,18,30,48] + nexus bonus.
  public query func getPlotProductionRate(plotId : Text) : async CoreTypes.PlotProductionRate {
    let tierIndex : Nat = switch (generatorTiers.get(plotId)) {
      case (null)      { 0 };
      case (?tier)     { CoreLib.tierToIndex(tier) };
    };
    let rateTotal  : Float = CoreLib.dailyRateFromTierIndex(tierIndex);
    let tierBonus  : Float = rateTotal - CoreLib.BASE_FRNTR_PER_DAY;
    let nexusLevel : Nat   = switch (plots.get(plotId)) {
      case (null)    { 0 };
      case (?plot)   { plot.nexusElectricityLevel };
    };
    let nexusBonusVal : Float = CoreLib.nexusBonus(nexusLevel);
    {
      plotId         = plotId;
      baseFRNTRPerDay = CoreLib.BASE_FRNTR_PER_DAY;
      tierBonus      = tierBonus;
      nexusBonus     = nexusBonusVal;
      totalPerDay    = rateTotal + nexusBonusVal;
      generatorTier  = tierIndex;
    };
  };

  // ---------------------------------------------------------------------------
  // Generator tier catalog
  // ---------------------------------------------------------------------------

  /// Returns the full ordered list of generator tier infos (6 tiers).
  /// Values match the canonical lookup table in lib/core.mo:
  /// tier 0=None(7/day), I=9, II=12, III=17, IV=25, V=37, VI=55 FRNTR/day.
  public query func getCoreGeneratorTiers() : async [CoreTypes.GeneratorTierInfo] {
    [
      { tierIndex = 0; name = "None";          bonusPerDay = 0.0;  costFRNTR = 0 },
      { tierIndex = 1; name = "Generator I";   bonusPerDay = 2.0;  costFRNTR = 500 },
      { tierIndex = 2; name = "Generator II";  bonusPerDay = 5.0;  costFRNTR = 1_500 },
      { tierIndex = 3; name = "Generator III"; bonusPerDay = 10.0; costFRNTR = 4_000 },
      { tierIndex = 4; name = "Generator IV";  bonusPerDay = 18.0; costFRNTR = 10_000 },
      { tierIndex = 5; name = "Generator V";   bonusPerDay = 30.0; costFRNTR = 25_000 },
      { tierIndex = 6; name = "Generator VI";  bonusPerDay = 48.0; costFRNTR = 60_000 },
    ];
  };
};
