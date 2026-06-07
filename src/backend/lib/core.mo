// Core domain logic: global stats aggregation, emission calculations, production rates.
import Debug "mo:core/Debug";
import Map   "mo:core/Map";
import Float "mo:core/Float";
import Nat   "mo:core/Nat";
import CoreTypes "../types/core";
import GameTypes "../types/game";

module {

  // ---------------------------------------------------------------------------
  // Daily emission
  // ---------------------------------------------------------------------------

  /// Base FRNTR per day per plot (no upgrades, no nexus).
  public let BASE_FRNTR_PER_DAY : Float = 7.0;

  /// Mineable supply cap (5 billion FRNTR can only be produced by landowners).
  public let MINEABLE_CAP : Nat = 5_000_000_000;

  /// Pre-minted supply (backed with initial liquidity at launch).
  public let PRE_MINTED : Nat = 5_000_000_000;

  /// Hard supply cap.
  public let MAX_SUPPLY : Nat = 10_000_000_000;

  /// Milestone size for daysUntilMilestone calculation (500M FRNTR).
  public let MILESTONE_SIZE : Nat = 500_000_000;

  // ---------------------------------------------------------------------------
  // Production rate helpers
  // ---------------------------------------------------------------------------

  /// Compute FRNTR per day for a given generator tier index (0–6).
  /// Formula: base 7 + (tier * 3).
  /// This is the canonical formula — use this everywhere, not hard-coded local tables.
  /// Compute FRNTR per day for a given generator tier index (0–6).
  /// Lookup table: tier 0=None→9, 1→12, 2→17, 3→25, 4→37, 5→55 (tier VI).
  /// Base 7 + bonus [2,5,10,18,30,48]. Index 0=no upgrade=base 7+2 bonus→9.
  public func dailyRateFromTierIndex(tierIndex : Nat) : Float {
    switch (tierIndex) {
      case (0) { 7.0  }; // no upgrade, base only
      case (1) { 9.0  }; // TierI:   base 7 + bonus 2
      case (2) { 12.0 }; // TierII:  base 7 + bonus 5
      case (3) { 17.0 }; // TierIII: base 7 + bonus 10
      case (4) { 25.0 }; // TierIV:  base 7 + bonus 18
      case (5) { 37.0 }; // TierV:   base 7 + bonus 30
      case (6) { 55.0 }; // TierVI:  base 7 + bonus 48
      case (_) { 7.0  }; // fallback: base rate
    };
  };

  /// Map a GeneratorTier variant to its index (0 = None … 6 = TierVI).
  public func tierToIndex(tier : GameTypes.GeneratorTier) : Nat {
    switch (tier) {
      case (#None)    { 0 };
      case (#TierI)   { 1 };
      case (#TierII)  { 2 };
      case (#TierIII) { 3 };
      case (#TierIV)  { 4 };
      case (#TierV)   { 5 };
      case (#TierVI)  { 6 };
    };
  };

  /// Nexus electricity bonus in FRNTR/day for a given level (0–3).
  /// Level 1 = +8, Level 2 = +24, Level 3 = +48.
  public func nexusBonus(level : Nat) : Float {
    switch (level) {
      case (1) { 8.0 };
      case (2) { 24.0 };
      case (3) { 48.0 };
      case (_) { 0.0 };
    };
  };

  // ---------------------------------------------------------------------------
  // GlobalStats / Tokenomics builders
  // ---------------------------------------------------------------------------

  /// Build a GlobalStats snapshot from raw counters.
  /// dailyEmission must be pre-computed by the caller (tier-accurate sum across all owned plots).
  public func buildGlobalStats(
    plotsSold            : Nat,
    totalFRNTRBurned     : Nat,
    totalFRNTRMined      : Nat,
    activePlayers        : Nat,
    dailyEmission        : Nat,
    totalUnclaimedTokens : Nat,
    totalPlayers         : Nat,
  ) : CoreTypes.GlobalStats {
    let circulating : Nat =
      PRE_MINTED + totalFRNTRMined -
      (if (totalFRNTRBurned > PRE_MINTED + totalFRNTRMined) { PRE_MINTED + totalFRNTRMined } else { totalFRNTRBurned });
    {
      circulatingSupply    = circulating;
      totalBurned          = totalFRNTRBurned;
      totalPlotsOwned      = plotsSold;
      activePlayers        = activePlayers;
      dailyEmission        = dailyEmission;
      totalUnclaimedTokens = totalUnclaimedTokens;
      totalPlayers         = totalPlayers;
    };
  };

  /// Build a Tokenomics snapshot from raw counters.
  public func buildTokenomics(
    totalFRNTRBurned  : Nat,
    totalFRNTRMined   : Nat,
    currentDailyRate  : Nat,
    plotsSold         : Nat,
  ) : CoreTypes.Tokenomics {
    let circulating : Nat =
      PRE_MINTED + totalFRNTRMined -
      (if (totalFRNTRBurned > PRE_MINTED + totalFRNTRMined) { PRE_MINTED + totalFRNTRMined } else { totalFRNTRBurned });
    // mineableRemaining depletes as tokens are burned (per tokenomics spec)
    let remaining   : Nat = if (MINEABLE_CAP > totalFRNTRBurned) { MINEABLE_CAP - totalFRNTRBurned } else { 0 };
    let dailyRate   : Nat = if (currentDailyRate > 0) { currentDailyRate } else { plotsSold * 7 };
    let burnRateEst : Nat = if (plotsSold > 0) { plotsSold * 100 / 10 } else { 0 };
    let toNext      : Nat = if (circulating % MILESTONE_SIZE == 0) { MILESTONE_SIZE }
                            else { MILESTONE_SIZE - (circulating % MILESTONE_SIZE) };
    let daysUntil   : Nat = if (dailyRate > 0) { toNext / dailyRate } else { 0 };
    {
      maxSupply          = MAX_SUPPLY;
      circulatingSupply  = circulating;
      totalBurned        = totalFRNTRBurned;
      emissionRate       = dailyRate;
      burnRate           = burnRateEst;
      remainingMineable  = remaining;
      daysUntilMilestone = daysUntil;
    };
  };
};
