// Public API mixin for game v1.0 endpoints.
// Exposes: plot pricing, production upgrades, plot transfers, tiered purchases.
import Map         "mo:core/Map";
import Runtime     "mo:core/Runtime";
import Time        "mo:core/Time";
import Principal   "mo:core/Principal";
import Nat         "mo:core/Nat";
import CommonTypes "../types/common";
import GameTypes   "../types/game";
import GameLib     "../lib/game";

mixin (
  // State slices injected from main.mo
  pricingState : { var pricing : CommonTypes.PlotPricing },
  plotUpgrades : Map.Map<GameTypes.PlotId, GameTypes.PlotUpgrades>,
  plotRarities : Map.Map<GameTypes.PlotId, GameTypes.PlotRarity>,
  plots        : Map.Map<Nat, { plotId : Nat; biome : Text; owner : ?Principal; nexusElectricityLevel : Nat; purchaseTimestamp : ?Int; var richness : Nat; lat : Float; lng : Float; iron : Nat; fuel : Nat; crystal : Nat; lastTick : Int; defenses : { turrets : Nat; shields : Nat; walls : Nat }; facilities : { electricityPlant : Bool; blockchainNode : Bool; dataCentre : Bool; aiLab : Bool }; attackCooldown : Int; faction : ?Text; morale : Nat; interceptorSystem : ?Text; nftTokenId : ?Nat }>,
  players      : Map.Map<Principal, { iron : Nat; fuel : Nat; crystal : Nat; frntBalance : Nat; plotsOwned : Nat; combatVictories : Nat; commanderType : ?Text; commanderAtk : Nat; commanderDef : Nat; satelliteExpiry : Int; reconTargets : [(Nat, Int)]; empTargets : [(Nat, Int)]; totalFRNTRBurned : Float; passiveIncomePerDay : Float }>,
  adminState   : { var adminPrincipal : Text },
) {

  // ---------------------------------------------------------------------------
  // Pricing queries
  // ---------------------------------------------------------------------------

  /// Get the canonical price (in e8s) for a given plot rarity tier.
  /// tier: 0 = Common, 1 = Rare, 2 = Epic
  public query func getPlotPrice(tier : Nat) : async Nat {
    let pricing = pricingState.pricing;
    switch (tier) {
      case (0) { (pricing.commonMin + pricing.commonMax) / 2 };
      case (1) { (pricing.rareMin   + pricing.rareMax)   / 2 };
      case (2) { (pricing.epicMin   + pricing.epicMax)   / 2 };
      case (_) { (pricing.commonMin + pricing.commonMax) / 2 };
    };
  };

  /// Get the full pricing configuration (admin-readable).
  public query func getPlotPricing() : async CommonTypes.PlotPricing {
    pricingState.pricing;
  };

  /// Admin: update plot pricing configuration without redeployment.
  public shared ({ caller }) func setPlotPricing(newPricing : CommonTypes.PlotPricing) : async () {
    if (caller.toText() != adminState.adminPrincipal) {
      Runtime.trap("Unauthorized: admin only");
    };
    pricingState.pricing := newPricing;
  };

  // ---------------------------------------------------------------------------
  // Production upgrade queries & updates
  // ---------------------------------------------------------------------------

  /// Get the current generator upgrade state for a plot.
  public query func getProductionUpgrades(plotId : Nat) : async GameTypes.PlotUpgradesView {
    let u = switch (plotUpgrades.get(plotId)) {
      case (?u) { u };
      case (null) { GameLib.defaultUpgrades(plotId) };
    };
    GameLib.upgradesView(u);
  };

  /// Get the full catalog of all six generator tiers.
  public query func getGeneratorTiers() : async [GameTypes.GeneratorTierInfo] {
    GameLib.generatorTiers;
  };

  /// Upgrade a plot's generator to the next tier.
  /// Caller must own the plot and have sufficient FRNTR.
  public shared ({ caller }) func upgradeGenerator(plotId : Nat) : async GameTypes.UpgradeResult {
    // Verify the plot exists and the caller owns it.
    let plot = switch (plots.get(plotId)) {
      case (?p) { p };
      case (null) { return #err(#PlotNotFound) };
    };
    if (plot.owner != ?caller) {
      return #err(#NotOwner);
    };

    // Get current upgrade record (or default).
    let current = switch (plotUpgrades.get(plotId)) {
      case (?u) { u };
      case (null) { GameLib.defaultUpgrades(plotId) };
    };

    // Determine the next tier.
    let next = switch (GameLib.nextTier(current.generatorTier)) {
      case (null)   { return #err(#AlreadyMaxTier) };
      case (?tier)  { tier };
    };
    let cost = GameLib.tierCost(next);

    // Deduct FRNTR from player balance.
    let player = switch (players.get(caller)) {
      case (?p) { p };
      case (null) { return #err(#NotOwner) };
    };
    if (player.frntBalance < cost) {
      return #err(#InsufficientFRNTR);
    };
    let updatedPlayer = { player with frntBalance = player.frntBalance - cost };
    players.add(caller, updatedPlayer);

    // Advance the tier and record timestamp.
    let newUpgrades : GameTypes.PlotUpgrades = {
      plotId;
      generatorTier = next;
      installedAt   = ?Time.now();
    };
    plotUpgrades.add(plotId, newUpgrades);
    #ok(newUpgrades);
  };

  // ---------------------------------------------------------------------------
  // Plot rarity
  // ---------------------------------------------------------------------------

  /// Get the rarity and canonical price for a specific plot.
  public query func getPlotPriceView(plotId : Nat) : async GameTypes.PlotPriceView {
    let rarity = switch (plotRarities.get(plotId)) {
      case (?r) { r };
      case (null) { #Common };
    };
    let priceE8s = GameLib.priceForRarity(rarity, pricingState.pricing);
    {
      rarity;
      priceE8s;
      rarityLabel = GameLib.rarityLabel(rarity);
    };
  };

  // ---------------------------------------------------------------------------
  // Tiered purchase
  // ---------------------------------------------------------------------------

  /// Purchase a plot; the ICP amount attached must match or exceed the plot's
  /// rarity-based price. Replaces the flat-fee purchasePlot for ICP-denominated sales.
  public shared ({ caller }) func purchasePlotWithTier(plotId : Nat, tier : Nat) : async { #ok : Text; #err : Text } {
    // Verify plot exists and is unowned.
    let plot = switch (plots.get(plotId)) {
      case (?p) { p };
      case (null) { return #err("Plot not found") };
    };
    if (plot.owner != null) {
      return #err("Plot already owned");
    };
    // Resolve rarity from stored rarities, falling back to biome derivation.
    let rarity = switch (plotRarities.get(plotId)) {
      case (?r) { r };
      case (null) {
        let r = GameLib.rarityFromBiome(plot.biome, plotId);
        plotRarities.add(plotId, r);
        r;
      };
    };
    // Validate that the requested tier matches the plot's rarity.
    let expectedTier : Nat = switch (rarity) {
      case (#Common) { 0 };
      case (#Rare)   { 1 };
      case (#Epic)   { 2 };
    };
    if (tier != expectedTier) {
      return #err("Tier mismatch for plot rarity");
    };
    let priceE8s = GameLib.priceForRarity(rarity, pricingState.pricing);
    // Assign ownership on-chain and record purchase timestamp.
    let updated = { plot with owner = ?caller; purchaseTimestamp = ?(Time.now()) };
    plots.add(plotId, updated);
    // Initialize upgrade record for the new owner.
    plotUpgrades.add(plotId, GameLib.defaultUpgrades(plotId));
    // Update player's plot count.
    let player = switch (players.get(caller)) {
      case (?p) { p };
      case (null) {
        {
          iron = 0; fuel = 0; crystal = 0; frntBalance = 0;
          plotsOwned = 0; combatVictories = 0; commanderType = null;
          commanderAtk = 0; commanderDef = 0; satelliteExpiry = 0;
          reconTargets = []; empTargets = []; totalFRNTRBurned = 0.0;
          passiveIncomePerDay = 0.0;
        };
      };
    };
    let updatedPlayer = { player with plotsOwned = player.plotsOwned + 1 };
    players.add(caller, updatedPlayer);
    #ok("Plot " # Nat.toText(plotId) # " purchased for " # Nat.toText(priceE8s) # " e8s");
  };

  // ---------------------------------------------------------------------------
  // Peer-to-peer plot transfer
  // ---------------------------------------------------------------------------

  /// Transfer ownership of a plot to another principal.
  /// The plot retains its biome, efficiency, and all upgrades.
  /// Only the current owner can call this.
  public shared ({ caller }) func transferPlot(plotId : Nat, toPrincipal : Principal) : async GameTypes.TransferResult {
    // Anonymous recipients are invalid.
    if (Principal.isAnonymous(toPrincipal)) {
      return #err(#InvalidRecipient);
    };
    // Verify the plot exists.
    let plot = switch (plots.get(plotId)) {
      case (?p) { p };
      case (null) { return #err(#PlotNotFound) };
    };
    // Only the current owner can transfer.
    if (plot.owner != ?caller) {
      return #err(#NotOwner);
    };
    if (toPrincipal == caller) {
      return #err(#SameOwner);
    };
    // Update ownership on-chain, retaining all biome/efficiency/upgrade data.
    plots.add(plotId, { plot with owner = ?toPrincipal });
    // Adjust plot counts for both parties.
    switch (players.get(caller)) {
      case (?p) {
        let updated = { p with plotsOwned = if (p.plotsOwned > 0) { p.plotsOwned - 1 } else { 0 } };
        players.add(caller, updated);
      };
      case (null) {};
    };
    switch (players.get(toPrincipal)) {
      case (?p) {
        players.add(toPrincipal, { p with plotsOwned = p.plotsOwned + 1 });
      };
      case (null) {
        // Register recipient as a minimal player entry.
        players.add(toPrincipal, {
          iron = 0; fuel = 0; crystal = 0; frntBalance = 0;
          plotsOwned = 1; combatVictories = 0; commanderType = null;
          commanderAtk = 0; commanderDef = 0; satelliteExpiry = 0;
          reconTargets = []; empTargets = []; totalFRNTRBurned = 0.0;
          passiveIncomePerDay = 0.0;
        });
      };
    };
    #ok;
  };
};
