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
  generatorTiers : Map.Map<Nat, GameTypes.GeneratorTier>,
  plots : Map.Map<Nat, { plotId : Nat; owner : ?Principal; nexusElectricityLevel : Nat; biome : Text; richness : Nat; lat : Float; lng : Float; iron : Nat; fuel : Nat; crystal : Nat; lastTick : Int; defenses : { turrets : Nat; shields : Nat; walls : Nat }; facilities : { electricityPlant : Bool; blockchainNode : Bool; dataCentre : Bool; aiLab : Bool }; attackCooldown : Int; faction : ?Text; morale : Nat; interceptorSystem : ?Text; purchaseTimestamp : ?Int; nftTokenId : ?Nat }>,
) {

  // ---------------------------------------------------------------------------
  // Global stats — UNIVERSE menu
  // ---------------------------------------------------------------------------

  /// Returns live global economy stats for the UNIVERSE panel.
  /// Field names match what the frontend expects: circulatingSupply, totalBurned,
  /// totalPlotsOwned, activePlayers, dailyEmission.
  public query func getGlobalStats() : async CoreTypes.GlobalStats {
    CoreLib.buildGlobalStats(
      plotSoldState.count,
      statsState.totalFRNTRBurned,
      statsState.totalFRNTRMined,
      statsState.activePlayers,
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
  /// Uses the canonical formula: base 7 + (tier * 3) + nexus bonus.
  public query func getPlotProductionRate(plotId : Nat) : async CoreTypes.PlotProductionRate {
    let tierIndex : Nat = switch (generatorTiers.get(plotId)) {
      case (null)      { 0 };
      case (?tier)     { CoreLib.tierToIndex(tier) };
    };
    let tierBonus  : Float = CoreLib.dailyRateFromTierIndex(tierIndex) - 7.0;
    let nexusLevel : Nat   = switch (plots.get(plotId)) {
      case (null)    { 0 };
      case (?plot)   { plot.nexusElectricityLevel };
    };
    let nexusBonusVal : Float = CoreLib.nexusBonus(nexusLevel);
    {
      plotId         = plotId;
      baseFRNTRPerDay = 7.0;
      tierBonus      = tierBonus;
      nexusBonus     = nexusBonusVal;
      totalPerDay    = 7.0 + tierBonus + nexusBonusVal;
      generatorTier  = tierIndex;
    };
  };

  // ---------------------------------------------------------------------------
  // Generator tier catalog
  // ---------------------------------------------------------------------------

  /// Returns the full ordered list of generator tier infos (6 tiers).
  public query func getCoreGeneratorTiers() : async [CoreTypes.GeneratorTierInfo] {
    [
      { tierIndex = 0; name = "None";          bonusPerDay = 0.0;  costFRNTR = 0 },
      { tierIndex = 1; name = "Generator I";   bonusPerDay = 3.0;  costFRNTR = 500 },
      { tierIndex = 2; name = "Generator II";  bonusPerDay = 6.0;  costFRNTR = 1_500 },
      { tierIndex = 3; name = "Generator III"; bonusPerDay = 9.0;  costFRNTR = 4_000 },
      { tierIndex = 4; name = "Generator IV";  bonusPerDay = 12.0; costFRNTR = 10_000 },
      { tierIndex = 5; name = "Generator V";   bonusPerDay = 15.0; costFRNTR = 25_000 },
      { tierIndex = 6; name = "Generator VI";  bonusPerDay = 18.0; costFRNTR = 60_000 },
    ];
  };
};
