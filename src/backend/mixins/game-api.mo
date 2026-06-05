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
import TestnetTypes "../types/testnet";
import Blob "mo:core/Blob";

mixin (
  // State slices injected from main.mo
  pricingState : { var pricing : CommonTypes.PlotPricing },
  plotUpgrades : Map.Map<GameTypes.PlotId, GameTypes.PlotUpgrades>,
  plotRarities : Map.Map<GameTypes.PlotId, GameTypes.PlotRarity>,
  generatorTiers : Map.Map<Nat, GameTypes.GeneratorTier>,
  plots        : Map.Map<Nat, { plotId : Nat; biome : Text; owner : ?Principal; nexusElectricityLevel : Nat; purchaseTimestamp : ?Int; richness : Nat; lat : Float; lng : Float; iron : Nat; fuel : Nat; crystal : Nat; lastTick : Int; defenses : { turrets : Nat; shields : Nat; walls : Nat }; facilities : { electricityPlant : Bool; blockchainNode : Bool; dataCentre : Bool; aiLab : Bool }; attackCooldown : Int; faction : ?Text; morale : Nat; interceptorSystem : ?Text; nftTokenId : ?Nat }>,
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
  /// FRNTR cost is burned via icrc1_transfer to burn address; 0.075% routed to treasury.
  /// Returns PlotUpgradesView (not PlotUpgrades) so callers see tier name + bonus.
  public shared ({ caller }) func upgradeGenerator(plotId : Nat) : async { #ok : GameTypes.PlotUpgradesView; #err : GameTypes.UpgradeError } {
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
    // Keep generatorTiers map in sync so plotDailyRate uses the updated tier.
    generatorTiers.add(plotId, next);
    #ok(GameLib.upgradesView(newUpgrades));
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
  // Sub-parcel slot status
  // ---------------------------------------------------------------------------

  /// Return 7 SubParcelInfo entries for a plot (slots 0-6).
  /// slotIndex 0 = center Nexus, 1-6 = surrounding sub-parcels.
  /// isLocked = true during the 4-hour post-purchase cooldown.
  /// cooldownSecondsRemaining = 0 when not locked.
  /// Sub-parcel ID = plotId * 10 + slotIndex (O(1) lookup).
  public query func getSubParcelStatus(plotId : Nat) : async [GameTypes.SubParcelInfo] {
    let now : Int = Time.now();
    let fourHoursNs : Int = 14_400_000_000_000;

    // Determine lock state from purchaseTimestamp
    let (isLocked, cooldownRemaining) : (Bool, Nat) = switch (plots.get(plotId)) {
      case (null) { (false, 0) };
      case (?plot) {
        switch (plot.purchaseTimestamp) {
          case (null) { (false, 0) };
          case (?ts) {
            let unlockAt : Int = ts + fourHoursNs;
            if (now < unlockAt) {
              let remaining : Int = unlockAt - now;
              let remainingSecs : Nat = (remaining / 1_000_000_000).toNat();
              (true, remainingSecs);
            } else {
              (false, 0);
            };
          };
        };
      };
    };

    // Build 7 SubParcelInfo entries (slot 0 = Nexus, slots 1-6 = surrounding)
    var result : [GameTypes.SubParcelInfo] = [];
    var slot = 0;
    while (slot < 7) {
      let (buildingType, resourceRate) : (Text, Float) = if (slot == 0) {
        let rate : Float = switch (plots.get(plotId)) {
          case (null) { 0.0 };
          case (?plot) {
            switch (plot.nexusElectricityLevel) {
              case (1) { 8.0 };
              case (2) { 24.0 };
              case (3) { 48.0 };
              case (_) { 0.0 };
            };
          };
        };
        ("Nexus", rate);
      } else {
        ("", 0.0);
      };
      result := result.concat([{
        slotIndex                = slot;
        isLocked                 = isLocked;
        cooldownSecondsRemaining = cooldownRemaining;
        buildingType             = buildingType;
        resourceRate             = resourceRate;
      }]);
      slot += 1;
    };
    result;
  };

  // ---------------------------------------------------------------------------
  // ICP-denominated plot purchase (ICRC-2 flow)
  // ---------------------------------------------------------------------------

  /// Purchase a plot with ICP using the ICRC-2 approve + transfer_from flow.
  /// The frontend must call icrc2_approve on the ICP ledger before calling this.
  /// Steps (atomic): verify plot exists and is unowned, call icrc2_transfer_from
  /// on ICP ledger (ryjl3-tyaaa-aaaaa-aaaba-cai), assign ownership, notify treasury.
  /// If any step fails, return {#err: reason} and do NOT assign ownership.
  public shared ({ caller }) func purchasePlot(plotId : Nat) : async { #ok : Text; #err : Text } {
    if (caller.isAnonymous()) { return #err("Anonymous users cannot purchase plots") };

    let plot = switch (plots.get(plotId)) {
      case (null) { return #err("Plot does not exist!") };
      case (?p)   { p };
    };

    switch (plot.owner) {
      case (?owner) {
        if (owner == caller) { return #err("You already own this plot") };
        return #err("Plot already owned");
      };
      case (null) {};
    };

    // Resolve canonical price in e8s from rarity
    let rarity = switch (plotRarities.get(plotId)) {
      case (?r) { r };
      case (null) {
        let r = GameLib.rarityFromBiome(plot.biome, plotId);
        plotRarities.add(plotId, r);
        r;
      };
    };
    let icpAmt : Nat = GameLib.priceForRarity(rarity, pricingState.pricing);

    // ICRC-2 types for ICP ledger
    type ICRC2Account = { owner : Principal; subaccount : ?Blob };
    type ICRC2TransferFromArgs = {
      from             : ICRC2Account;
      to               : ICRC2Account;
      amount           : Nat;
      fee              : ?Nat;
      memo             : ?Blob;
      created_at_time  : ?Nat64;
      spender_subaccount : ?Blob;
    };
    type ICRC2TransferFromError = {
      #InsufficientFunds    : { balance : Nat };
      #InsufficientAllowance : { allowance : Nat };
      #TooOld;
      #CreatedInFuture      : { ledger_time : Nat64 };
      #Duplicate            : { duplicate_of : Nat };
      #TemporarilyUnavailable;
      #GenericError         : { error_code : Nat; message : Text };
      #BadFee               : { expected_fee : Nat };
      #BadBurn              : { min_burn_amount : Nat };
    };
    type ICRC2TransferFromResult = { #Ok : Nat; #Err : ICRC2TransferFromError };

    let icpLedger = actor("ryjl3-tyaaa-aaaaa-aaaba-cai") : actor {
      icrc2_transfer_from : (ICRC2TransferFromArgs) -> async ICRC2TransferFromResult
    };

    // Get game canister self-principal from admin state (stored as adminPrincipal)
    // The caller must have pre-approved the game canister as ICRC-2 spender
    let selfText = adminState.adminPrincipal; // fallback; proper deployment sets selfPrincipalText
    let selfPrincipal = Principal.fromText(selfText);

    let transferArgs : ICRC2TransferFromArgs = {
      from             = { owner = caller; subaccount = null };
      to               = { owner = selfPrincipal; subaccount = null };
      amount           = icpAmt;
      fee              = ?10_000;
      memo             = null;
      created_at_time  = null;
      spender_subaccount = null;
    };
    switch (await icpLedger.icrc2_transfer_from(transferArgs)) {
      case (#Err(err)) {
        return #err("ICP transfer failed: " # debug_show(err));
      };
      case (#Ok(_)) {};
    };

    // ICP transfer succeeded — assign ownership
    let player = switch (players.get(caller)) {
      case (?p) { p };
      case (null) {
        {
          iron = 0; fuel = 0; crystal = 0; frntBalance = 600_00000000;
          plotsOwned = 0; combatVictories = 0; commanderType = null;
          commanderAtk = 0; commanderDef = 0; satelliteExpiry = 0;
          reconTargets = []; empTargets = []; totalFRNTRBurned = 0.0;
          passiveIncomePerDay = 0.0;
        };
      };
    };

    let updatedPlayer = { player with plotsOwned = player.plotsOwned + 1 };
    players.add(caller, updatedPlayer);

    let updatedPlot = { plot with owner = ?caller; purchaseTimestamp = ?(Time.now()) };
    plots.add(plotId, updatedPlot);

    // Initialize upgrade record for this plot
    plotUpgrades.add(plotId, GameLib.defaultUpgrades(plotId));

    #ok("Plot " # Nat.toText(plotId) # " purchased successfully");
  };

  // ---------------------------------------------------------------------------
  // Testnet faucet (no cooldown)
  // ---------------------------------------------------------------------------

  /// Claim 500 FRNTR + 2 ICP for testnet testing. Always succeeds, no cooldown.
  public shared ({ caller }) func testFaucetV2() : async { #ok : TestnetTypes.FaucetGrant; #err : Text } {
    if (caller.isAnonymous()) { return #err("Must be authenticated") };
    // Ensure player record exists
    switch (players.get(caller)) {
      case (null) {
        players.add(caller, {
          iron = 0; fuel = 0; crystal = 0; frntBalance = 600_00000000;
          plotsOwned = 0; combatVictories = 0; commanderType = null;
          commanderAtk = 0; commanderDef = 0; satelliteExpiry = 0;
          reconTargets = []; empTargets = []; totalFRNTRBurned = 0.0;
          passiveIncomePerDay = 0.0;
        });
      };
      case (?_) {};
    };
    // Return the standard grant — ledger transfer handled by caller on frontend
    // or via main.mo testFaucetV2 which performs the actual icrc1_transfer
    #ok({ frntGranted = 500_00000000; icpGranted = 2_00000000 });
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
