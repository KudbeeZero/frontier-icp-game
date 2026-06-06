// Game-domain types for Frontier: Missile Horizon v1.0.
import CommonTypes "common";

module {
  // Re-export common aliases for convenience inside this domain.
  public type PlotId    = CommonTypes.PlotId;
  public type PlayerId  = CommonTypes.PlayerId;
  public type Timestamp = CommonTypes.Timestamp;
  public type PlotRarity = CommonTypes.PlotRarity;

  // ---------------------------------------------------------------------------
  // Biome system (v2) — 8 variants mapped from real-world H3 lat/lng geography.
  // AsteroidImpact: rare (~10% of land), exotic mineral particles from atmospheric
  // asteroid breakup. Volcanic: ~2-3% of land. Arctic: lat > 60 or lat < -60.
  // ---------------------------------------------------------------------------
  public type Biome = {
    #Temperate;       // mid-latitude continental land (default land)
    #Desert;          // Sahara/Arabian/Australian interior (lat 20-40, specific lon)
    #Arctic;          // polar regions (lat > 60 or lat < -60)
    #Tropical;        // equatorial land (lat -20 to +20)
    #Ocean;           // shallow/coastal water
    #DeepOcean;       // deep open ocean
    #Volcanic;        // ~2-3% of land, scattered deterministically
    #AsteroidImpact;  // ~10% of remaining land, exotic minerals, deterministic seed
  };

  // Simplified public info returned by getPlotInfo.
  // Only exposes biome + owner + resourcePercentage — no mineral breakdown.
  public type PlotInfoResponse = {
    plotId             : PlotId;
    owner              : ?Principal;
    biome              : Biome;
    resourcePercentage : Nat;  // 0-100, overall resource richness percentage
  };

  // Resource types produced by mining plots.
  public type ResourceType = {
    #Iron;
    #Fuel;
    #Crystal;
    #RareEarth;
  };

  // Result of a mine action on a plot.
  public type MineResult = {
    plotId      : PlotId;
    resourceYields : [(ResourceType, Float)];  // (type, amount) for each resource
    frntRate    : Float;                        // current FRNTR/day rate for this plot
    efficiency  : Float;                        // 0.0–1.0, depletes over time
  };

  // Six production upgrade tiers per plot.
  // Each tier stacks on top of the base 7 FRNTR/day.
  // Tier bonus: I +2, II +5, III +10, IV +18, V +30, VI +48 FRNTR/day.
  public type GeneratorTier = {
    #None;      // no upgrade
    #TierI;     // +2/day,  cost 500 FRNTR
    #TierII;    // +5/day,  cost 1500 FRNTR
    #TierIII;   // +10/day, cost 4000 FRNTR
    #TierIV;    // +18/day, cost 10000 FRNTR
    #TierV;     // +30/day, cost 25000 FRNTR
    #TierVI;    // +48/day, cost 60000 FRNTR
  };

  // Immutable record describing a generator tier's stats.
  public type GeneratorTierInfo = {
    tier       : GeneratorTier;
    name       : Text;        // "Generator I" through "Generator VI"
    bonusPerDay : Float;      // additional FRNTR per day
    costFRNTR  : Nat;         // FRNTR required to install
  };

  // Per-plot upgrade record stored in game state.
  public type PlotUpgrades = {
    plotId         : PlotId;
    generatorTier  : GeneratorTier;
    installedAt    : ?Timestamp;  // time generator was last upgraded
  };

  // Result type for upgrade operations.
  public type UpgradeResult = {
    #ok : PlotUpgrades;
    #err : UpgradeError;
  };

  public type UpgradeError = {
    #NotOwner;
    #PlotNotFound;
    #InsufficientFRNTR;
    #AlreadyMaxTier;
    #InvalidTier;
    #SubParcelLocked;
  };

  // Result type for plot transfer.
  public type TransferResult = {
    #ok;
    #err : TransferError;
  };

  public type TransferError = {
    #NotOwner;
    #PlotNotFound;
    #InvalidRecipient;   // e.g. anonymous principal
    #SameOwner;          // caller tries to transfer to themselves
  };

  // Lightweight public-facing view of a plot's upgrades (shareable).
  public type PlotUpgradesView = {
    plotId         : PlotId;
    generatorTier  : GeneratorTier;
    tierName       : Text;
    bonusPerDay    : Float;
    installedAt    : ?Timestamp;
    nextTierCost   : ?Nat;       // null when already at max tier
  };

  // Public view of a plot's rarity and current price (in e8s).
  public type PlotPriceView = {
    rarity       : PlotRarity;
    priceE8s     : Nat;         // canonical price for this plot
    rarityLabel  : Text;        // "Common", "Rare", "Epic"
  };
  // Sub-parcel slot status — 7 slots per plot (0=Nexus center, 1-6=surrounding).
  // Sub-parcel ID formula: plotId # "_" # Nat.toText(slotIndex).
  public type SubParcelStatus = {
    subParcelId  : Text;  // plotId # "_" # slotIndex
    slotIndex    : Nat;   // 0-6
    buildingType : ?Text; // null when empty
    cooldownEnd  : Int;   // nanoseconds timestamp; 0 means not locked
    isLocked     : Bool;  // true during 4-hour post-purchase cooldown
    productionRate : Float; // FRNTR/day contribution from this slot
  };

  // Public-facing sub-parcel info returned by getSubParcelStatus.
  // slotIndex 0 = center Nexus, 1-6 = surrounding sub-parcels.
  // cooldownSecondsRemaining is 0 when not locked.
  public type SubParcelInfo = {
    slotIndex                : Nat;
    isLocked                 : Bool;
    cooldownSecondsRemaining : Nat;
    buildingType             : Text;  // "" when empty
    resourceRate             : Float; // FRNTR/day contribution
  };


  // ---------------------------------------------------------------------------
  // Survey system — pay-to-unlock, time-based result generation.
  // Players pay FRNTR to start a survey; result is computed after the timer
  // expires (30 minutes).  Only biome name + resource percentages are revealed.
  // ---------------------------------------------------------------------------
  public type SurveyStatus = {
    #Locked;       // not yet started
    #InProgress;   // paid, timer running
    #Completed;    // timer expired, result available
  };

  // Detailed survey result revealed after the timer.
  public type SurveyResult = {
    biome              : Biome;
    resourcePercentage : Nat;    // 0-100 overall richness
    bonusInfo          : ?Text;  // extra flavour for rare/epic biomes (e.g. "Asteroid particles detected")
  };

  // A single survey record stored per (player, plot) pair.
  public type Survey = {
    plotId      : PlotId;
    surveyor    : Principal;
    status      : SurveyStatus;
    unlockCost  : Nat;          // FRNTR e8s paid to start the survey
    startTime   : Int;          // nanosecond timestamp; 0 if not yet started
    duration    : Nat;          // nanoseconds until result is available (1_800_000_000_000 = 30 min)
    result      : ?SurveyResult;
  };

  // Key used for the survey map: plotId # "::" # Principal.toText(surveyor)
  public type SurveyKey = Text;

  // Public-facing survey state returned to the frontend.
  public type SurveyView = {
    plotId              : PlotId;
    status              : SurveyStatus;
    unlockCost          : Nat;
    startTime           : Int;
    secondsRemaining    : Nat;    // 0 when not in-progress or completed
    result              : ?SurveyResult;
  };

  // Faucet result for testFaucetV2 is defined in types/testnet.mo as FaucetGrant.
};

