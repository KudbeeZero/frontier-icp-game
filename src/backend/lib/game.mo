// Domain logic for game v1.0: plot pricing, generator upgrades, plot transfers.
import Float  "mo:core/Float";
import CommonTypes "../types/common";
import GameTypes   "../types/game";

module {
  // ---------------------------------------------------------------------------
  // Generator tier catalog (6 tiers, V1.0 mainnet costs)
  // ---------------------------------------------------------------------------

  /// Ordered array of all six generator tiers.
  public let generatorTiers : [GameTypes.GeneratorTierInfo] = [
    { tier = #TierI;   name = "Generator I";   bonusPerDay =  2.0; costFRNTR =    500 },
    { tier = #TierII;  name = "Generator II";  bonusPerDay =  5.0; costFRNTR =   1500 },
    { tier = #TierIII; name = "Generator III"; bonusPerDay = 10.0; costFRNTR =   4000 },
    { tier = #TierIV;  name = "Generator IV";  bonusPerDay = 18.0; costFRNTR =  10000 },
    { tier = #TierV;   name = "Generator V";   bonusPerDay = 30.0; costFRNTR =  25000 },
    { tier = #TierVI;  name = "Generator VI";  bonusPerDay = 48.0; costFRNTR =  60000 },
  ];

  /// Daily FRNTR bonus for a given generator tier.
  public func tierBonus(tier : GameTypes.GeneratorTier) : Float {
    switch (tier) {
      case (#None)    { 0.0 };
      case (#TierI)   { 2.0 };
      case (#TierII)  { 5.0 };
      case (#TierIII) { 10.0 };
      case (#TierIV)  { 18.0 };
      case (#TierV)   { 30.0 };
      case (#TierVI)  { 48.0 };
    };
  };

  /// FRNTR cost to reach a given tier (cost of upgrading TO that tier).
  public func tierCost(tier : GameTypes.GeneratorTier) : Nat {
    switch (tier) {
      case (#None)    { 0 };
      case (#TierI)   { 500 };
      case (#TierII)  { 1500 };
      case (#TierIII) { 4000 };
      case (#TierIV)  { 10000 };
      case (#TierV)   { 25000 };
      case (#TierVI)  { 60000 };
    };
  };

  /// Human-readable name for a tier.
  public func tierName(tier : GameTypes.GeneratorTier) : Text {
    switch (tier) {
      case (#None)    { "No Generator" };
      case (#TierI)   { "Generator I" };
      case (#TierII)  { "Generator II" };
      case (#TierIII) { "Generator III" };
      case (#TierIV)  { "Generator IV" };
      case (#TierV)   { "Generator V" };
      case (#TierVI)  { "Generator VI" };
    };
  };

  /// Returns the next tier above the given one, or null if already at max.
  public func nextTier(tier : GameTypes.GeneratorTier) : ?GameTypes.GeneratorTier {
    switch (tier) {
      case (#None)    { ?#TierI };
      case (#TierI)   { ?#TierII };
      case (#TierII)  { ?#TierIII };
      case (#TierIII) { ?#TierIV };
      case (#TierIV)  { ?#TierV };
      case (#TierV)   { ?#TierVI };
      case (#TierVI)  { null }; // already at max
    };
  };

  // ---------------------------------------------------------------------------
  // Rarity helpers
  // ---------------------------------------------------------------------------

  /// Determine plot rarity from a biome string and a seeded value.
  /// Biomes: volcanic, toxic → Epic; mountain, arctic → Rare; others → Common.
  public func rarityFromBiome(biome : Text, seed : Nat) : CommonTypes.PlotRarity {
    ignore seed; // seed reserved for future random distribution
    switch (biome) {
      case ("volcanic") { #Epic };
      case ("toxic")    { #Epic };
      case ("mountain") { #Rare };
      case ("arctic")   { #Rare };
      case (_)          { #Common };
    };
  };

  /// Canonical price in e8s for a given rarity using the stored pricing config.
  /// Returns the midpoint of the pricing range.
  public func priceForRarity(
    rarity : CommonTypes.PlotRarity,
    pricing : CommonTypes.PlotPricing,
  ) : Nat {
    switch (rarity) {
      case (#Common) { (pricing.commonMin + pricing.commonMax) / 2 };
      case (#Rare)   { (pricing.rareMin   + pricing.rareMax)   / 2 };
      case (#Epic)   { (pricing.epicMin   + pricing.epicMax)   / 2 };
    };
  };

  /// Human-readable rarity label.
  public func rarityLabel(rarity : CommonTypes.PlotRarity) : Text {
    switch (rarity) {
      case (#Common) { "Common" };
      case (#Rare)   { "Rare" };
      case (#Epic)   { "Epic" };
    };
  };

  // ---------------------------------------------------------------------------
  // PlotUpgrades helpers
  // ---------------------------------------------------------------------------

  /// Build the public view of a plot's upgrades.
  public func upgradesView(u : GameTypes.PlotUpgrades) : GameTypes.PlotUpgradesView {
    let next = nextTier(u.generatorTier);
    let nextCost : ?Nat = switch (next) {
      case (null)  { null };
      case (?tier) { ?tierCost(tier) };
    };
    {
      plotId        = u.plotId;
      generatorTier = u.generatorTier;
      tierName      = tierName(u.generatorTier);
      bonusPerDay   = tierBonus(u.generatorTier);
      installedAt   = u.installedAt;
      nextTierCost  = nextCost;
    };
  };

  /// Build a default (no-upgrade) record for a newly purchased plot.
  public func defaultUpgrades(plotId : GameTypes.PlotId) : GameTypes.PlotUpgrades {
    { plotId; generatorTier = #None; installedAt = null };
  };

  // ---------------------------------------------------------------------------
  // Resource mining helpers
  // ---------------------------------------------------------------------------

  /// Base resource yield rates per biome (per mine call, before efficiency).
  /// Returns (Iron, Fuel, Crystal, RareEarth) base amounts.
  public func biomeBaseYields(biome : Text) : (Float, Float, Float, Float) {
    switch (biome) {
      case ("desert")    { (0.8, 2.5, 0.3, 0.4) };   // fuel-rich
      case ("arctic")    { (1.0, 0.5, 2.0, 1.5) };   // crystal/rare earth bonus
      case ("jungle")    { (1.5, 1.0, 0.8, 0.6) };   // iron-rich
      case ("ocean")     { (0.5, 1.5, 1.2, 0.8) };
      case ("mountain")  { (2.0, 0.8, 1.5, 1.2) };   // iron/crystal rich
      case ("volcanic")  { (1.8, 3.0, 0.5, 2.0) };   // high fuel + rare earth
      case ("toxic")     { (0.6, 1.0, 2.5, 3.0) };   // crystal/rare earth
      case ("grassland") { (1.2, 1.2, 0.9, 0.7) };
      case ("tundra")    { (0.9, 0.7, 1.8, 1.4) };
      case (_)           { (1.0, 1.0, 1.0, 0.8) };   // default balanced
    };
  };

  /// Apply ±10% random variance to a yield amount using a simple deterministic seed.
  public func applyVariance(base : Float, seed : Int) : Float {
    // Deterministic pseudo-variance: seed mod 21 maps to -10%..+10% in 1% steps
    let step : Int = ((seed % 21) + 21) % 21; // 0..20
    let pct : Float = (step.toFloat() - 10.0) / 100.0; // -0.10..+0.10
    base * (1.0 + pct);
  };

  /// Compute resource yields for a single mine call.
  /// Returns array of (ResourceType, Float) for all 4 resources.
  public func computeMineYields(
    biome : Text,
    efficiency : Float,
    seed : Int,
  ) : [(GameTypes.ResourceType, Float)] {
    let (iron, fuel, crystal, rare) = biomeBaseYields(biome);
    [
      (#Iron,      applyVariance(iron    * efficiency, seed)),
      (#Fuel,      applyVariance(fuel    * efficiency, seed + 1)),
      (#Crystal,   applyVariance(crystal * efficiency, seed + 2)),
      (#RareEarth, applyVariance(rare    * efficiency, seed + 3)),
    ];
  };
};
