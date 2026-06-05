// Game-domain types for Frontier: Missile Horizon v1.0.
import CommonTypes "common";

module {
  // Re-export common aliases for convenience inside this domain.
  public type PlotId    = CommonTypes.PlotId;
  public type PlayerId  = CommonTypes.PlayerId;
  public type Timestamp = CommonTypes.Timestamp;
  public type PlotRarity = CommonTypes.PlotRarity;

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
};
