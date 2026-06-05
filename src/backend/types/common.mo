// Common cross-cutting types shared across all game domains.
module {
  public type Timestamp = Int;
  public type PlayerId = Principal;
  public type PlotId = Nat;

  // Plot rarity tiers — determines pricing and base characteristics.
  public type PlotRarity = {
    #Common;
    #Rare;
    #Epic;
  };

  // Admin-configurable pricing for each rarity tier (in ICP e8s — 1 ICP = 100_000_000 e8s).
  // Common: 2-3 ICP, Rare: 6-12 ICP, Epic: 20-40 ICP.
  public type PlotPricing = {
    commonMin  : Nat;
    commonMax  : Nat;
    rareMin    : Nat;
    rareMax    : Nat;
    epicMin    : Nat;
    epicMax    : Nat;
  };

  // Default pricing in e8s (midpoints: Common=2.5 ICP, Rare=9 ICP, Epic=30 ICP).
  public let defaultPricing : PlotPricing = {
    commonMin = 200_000_000;   // 2 ICP
    commonMax = 300_000_000;   // 3 ICP
    rareMin   = 600_000_000;   // 6 ICP
    rareMax   = 1_200_000_000; // 12 ICP
    epicMin   = 2_000_000_000; // 20 ICP
    epicMax   = 4_000_000_000; // 40 ICP
  };
};
