// Domain logic for game v1.0: plot pricing, generator upgrades, plot transfers,
// biome assignment, resource helpers.
import Float  "mo:core/Float";
import Int    "mo:core/Int";
import Nat32  "mo:core/Nat32";
import Char   "mo:core/Char";
import Text   "mo:core/Text";
import CommonTypes "../types/common";
import GameTypes   "../types/game";

module {
  // ---------------------------------------------------------------------------
  // Generator tier catalog (6 tiers, V1.0 mainnet costs)
  // Costs: [500, 1500, 4000, 10000, 25000, 60000] FRNTR
  // Rates: [7, 9, 12, 17, 25, 37, 55] FRNTR/day (base=7, tier bonuses stack)
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
  /// Tier costs confirmed: [500, 1500, 4000, 10000, 25000, 60000] FRNTR
  /// With 5000 FRNTR faucet grant, TierI (500) and TierII (1500) are
  /// immediately affordable from a single faucet claim on testnet.
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
  // Biome assignment (v2) — deterministic from H3 lat/lng + hash seed
  // ---------------------------------------------------------------------------

  /// Deterministic hash of a plot's H3 index string for pseudo-random biome rolls.
  /// Uses a simple polynomial hash so the same plotId always produces the same value.
  public func plotHash(plotId : Text) : Nat {
    var h : Nat = 5381;
    for (c in plotId.chars()) {
      let code : Nat = c.toNat32().toNat();
      h := (h * 31 + code) % 1_000_000_007;
    };
    h;
  };

  /// Check whether a coordinate sits over land (rough bounding-box heuristic).
  /// Returns false for coordinates that are clearly open ocean.
  func isLikelyLand(lat : Float, lng : Float) : Bool {
    // Rough land bounding boxes to distinguish ocean from land biomes.
    // Americas
    if (lng >= -170.0 and lng <= -30.0 and lat >= -60.0 and lat <= 85.0) return true;
    // Europe + Africa + Middle East
    if (lng >= -25.0 and lng <= 60.0 and lat >= -40.0 and lat <= 72.0) return true;
    // Russia + Asia
    if (lng >= 25.0 and lng <= 180.0 and lat >= 0.0 and lat <= 80.0) return true;
    // South / Southeast Asia
    if (lng >= 60.0 and lng <= 155.0 and lat >= -15.0 and lat <= 50.0) return true;
    // Australia
    if (lng >= 110.0 and lng <= 155.0 and lat >= -45.0 and lat <= -10.0) return true;
    false;
  };

  /// Determine whether a coordinate is in a "desert" band.
  /// Covers Sahara/Arabian/Australian interior.
  func isDesertBand(lat : Float, lng : Float) : Bool {
    let absLat = if (lat < 0.0) { -lat } else { lat };
    if (absLat < 20.0 or absLat > 42.0) return false;
    // North Africa / Middle East / Arabian Peninsula
    if (lng >= -18.0 and lng <= 60.0 and lat >= 15.0 and lat <= 35.0) return true;
    // Central Asia dry belt
    if (lng >= 45.0 and lng <= 75.0 and lat >= 20.0 and lat <= 35.0) return true;
    // Australian interior
    if (lng >= 115.0 and lng <= 140.0 and lat >= -35.0 and lat <= -22.0) return true;
    false;
  };

  /// Assign a Biome to a plot based on its H3 cell centroid and a deterministic hash.
  /// Priority order:
  ///   1. Arctic if |lat| > 60
  ///   2. DeepOcean / Ocean if not land
  ///   3. Desert band
  ///   4. Tropical (|lat| <= 20)
  ///   5. Volcanic (~2-3% of land, hash % 40 == 0)
  ///   6. AsteroidImpact (~10% of remaining land, hash % 10 == 1)
  ///   7. Temperate (default)
  public func assignBiome(lat : Float, lng : Float, plotId : Text) : GameTypes.Biome {
    let absLat = if (lat < 0.0) { -lat } else { lat };

    // 1. Polar
    if (absLat > 60.0) return #Arctic;

    let land = isLikelyLand(lat, lng);
    // 2. Ocean classification
    if (not land) {
      // Deep ocean: far from any coast, rough proxy: |lat| < 50 and far from land boxes
      let deepProxy = absLat < 50.0 and
        not (lng >= -25.0 and lng <= 60.0) and
        not (lng >= 90.0 and lng <= 180.0 and lat >= -20.0 and lat <= 20.0);
      if (deepProxy) return #DeepOcean;
      return #Ocean;
    };

    // Land biomes
    // 3. Desert
    if (isDesertBand(lat, lng)) return #Desert;

    // 4. Tropical
    if (absLat <= 20.0) return #Tropical;

    // Hash-based rare biomes on remaining land
    let h = plotHash(plotId);
    // 5. Volcanic: ~2.5% (hash mod 40 == 0)
    if (h % 40 == 0) return #Volcanic;
    // 6. AsteroidImpact: ~10% of remaining land (hash mod 10 == 1)
    if (h % 10 == 1) return #AsteroidImpact;

    // 7. Default temperate
    #Temperate;
  };

  /// Compute resourcePercentage (0-100) for a plot.
  /// Rare biomes yield higher resource percentages.
  public func resourcePercentageForBiome(biome : GameTypes.Biome, plotId : Text) : Nat {
    let h = plotHash(plotId);
    let base : Nat = switch (biome) {
      case (#AsteroidImpact) { 75 }; // exotic particles, high base
      case (#Volcanic)       { 70 };
      case (#DeepOcean)      { 40 }; // shipping lane minerals
      case (#Desert)         { 55 }; // fuel-rich
      case (#Arctic)         { 60 }; // rare earth / crystal
      case (#Tropical)       { 65 }; // diverse resources
      case (#Ocean)          { 35 };
      case (#Temperate)      { 50 };
    };
    // ±15 variance seeded by plot hash
    let variance : Nat = h % 31; // 0-30
    let raw : Nat = if (variance >= 15) {
      base + (variance - 15);
    } else {
      if (base >= (15 - variance)) { base - (15 - variance) } else { 0 };
    };
    if (raw > 100) { 100 } else { raw };
  };

  // ---------------------------------------------------------------------------
  // Rarity helpers
  // ---------------------------------------------------------------------------

  /// Determine plot rarity from a Biome variant.
  /// Volcanic, AsteroidImpact → Epic; Arctic, DeepOcean → Rare; others → Common.
  public func rarityFromBiomeV2(biome : GameTypes.Biome) : CommonTypes.PlotRarity {
    switch (biome) {
      case (#Volcanic)      { #Epic };
      case (#AsteroidImpact){ #Epic };
      case (#Arctic)        { #Rare };
      case (#DeepOcean)     { #Rare };
      case (_)              { #Common };
    };
  };

  /// Determine plot rarity from a biome string and a seeded value (legacy compat).
  public func rarityFromBiome(biome : Text, seed : Nat) : CommonTypes.PlotRarity {
    ignore seed;
    switch (biome) {
      case ("volcanic")      { #Epic };
      case ("toxic")         { #Epic };
      case ("asteroidimpact"){ #Epic };
      case ("mountain")      { #Rare };
      case ("arctic")        { #Rare };
      case ("deepocean")     { #Rare };
      case (_)               { #Common };
    };
  };

  /// Canonical price in e8s for a given rarity using the stored pricing config.
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
  /// Updated for v2 biome system including AsteroidImpact exotic yields.
  public func biomeBaseYields(biome : Text) : (Float, Float, Float, Float) {
    switch (biome) {
      case ("Desert")          { (0.8, 2.5, 0.3, 0.4) };   // fuel-rich
      case ("Arctic")          { (1.0, 0.5, 2.0, 1.5) };   // crystal/rare earth bonus
      case ("Tropical")        { (1.5, 1.0, 0.8, 0.6) };   // iron-rich
      case ("Ocean")           { (0.5, 1.5, 1.2, 0.8) };   // shipping lane minerals
      case ("DeepOcean")       { (0.3, 1.8, 0.8, 1.2) };   // rare minerals from deep vents
      case ("Volcanic")        { (1.8, 3.0, 0.5, 2.0) };   // high fuel + rare earth
      case ("AsteroidImpact")  { (2.5, 0.8, 3.5, 4.0) };   // exotic particles: crystal/rare++
      case ("Temperate")       { (1.2, 1.2, 0.9, 0.7) };   // balanced
      // Legacy biome string compat
      case ("desert")          { (0.8, 2.5, 0.3, 0.4) };
      case ("arctic")          { (1.0, 0.5, 2.0, 1.5) };
      case ("jungle")          { (1.5, 1.0, 0.8, 0.6) };
      case ("ocean")           { (0.5, 1.5, 1.2, 0.8) };
      case ("mountain")        { (2.0, 0.8, 1.5, 1.2) };
      case ("volcanic")        { (1.8, 3.0, 0.5, 2.0) };
      case ("toxic")           { (0.6, 1.0, 2.5, 3.0) };
      case ("grassland")       { (1.2, 1.2, 0.9, 0.7) };
      case ("tundra")          { (0.9, 0.7, 1.8, 1.4) };
      case (_)                 { (1.0, 1.0, 1.0, 0.8) };   // default balanced
    };
  };

  /// Apply ±10% random variance to a yield amount using a simple deterministic seed.
  public func applyVariance(base : Float, seed : Int) : Float {
    let step : Int = ((seed % 21) + 21) % 21;
    let pct : Float = (step.toFloat() - 10.0) / 100.0;
    base * (1.0 + pct);
  };

  /// Compute resource yields for a single mine call.
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
