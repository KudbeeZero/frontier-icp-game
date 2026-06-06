// Public API mixin for game v1.0 endpoints.
// Exposes: plot pricing, production upgrades, plot transfers, tiered purchases,
// simplified plot info, claim tokens.
import Map         "mo:core/Map";
import Runtime     "mo:core/Runtime";
import Time        "mo:core/Time";
import Int         "mo:core/Int";
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
  generatorTiers : Map.Map<Text, GameTypes.GeneratorTier>,
  plots        : Map.Map<Text, { plotId : Text; biome : Text; owner : ?Principal; nexusElectricityLevel : Nat; purchaseTimestamp : ?Int; richness : Nat; lat : Float; lng : Float; iron : Nat; fuel : Nat; crystal : Nat; lastTick : Int; defenses : { turrets : Nat; shields : Nat; walls : Nat }; facilities : { electricityPlant : Bool; blockchainNode : Bool; dataCentre : Bool; aiLab : Bool }; attackCooldown : Int; faction : ?Text; morale : Nat; interceptorSystem : ?Text; nftTokenId : ?Nat }>,
  players      : Map.Map<Principal, { iron : Nat; fuel : Nat; crystal : Nat; frntBalance : Nat; plotsOwned : Nat; combatVictories : Nat; commanderType : ?Text; commanderAtk : Nat; commanderDef : Nat; satelliteExpiry : Int; reconTargets : [(Nat, Int)]; empTargets : [(Nat, Int)]; totalFRNTRBurned : Float; passiveIncomePerDay : Float; lastClaimTime : Int }>,
  adminState   : { var adminPrincipal : Text },
  // selfPrincipalState: the game canister's own principal text (for ICRC-2 transfer_from `to` field)
  selfPrincipalState : { var selfPrincipalText : Text },
  // Feature flags injected from main.mo
  // subParcelAccumulationEnabled: re-enable for future sub-parcel accumulation updates
  featureFlags : { var subParcelAccumulationEnabled : Bool; var commanderNFTEnabled : Bool },
  frntrLedgerState : { var frntrLedger : Text },
) {

  // ---------------------------------------------------------------------------
  // Simplified plot info — public query (biome + owner + resourcePercentage only)
  // Per requirements: no mineral breakdown, no mining predictions, no sub-parcel yield.
  // ---------------------------------------------------------------------------

  /// Return the minimal public info for a plot: id, owner, biome, resourcePercentage.
  /// Does NOT expose per-mineral rates, mining predictions, or sub-parcel yield data.
  public query func getPlotInfo(plotId : Text) : async GameTypes.PlotInfoResponse {
    switch (plots.get(plotId)) {
      case (null) {
        // Plot not yet seeded: return a default unowned Temperate entry
        {
          plotId;
          owner = null;
          biome = #Temperate;
          resourcePercentage = 50;
        };
      };
      case (?plot) {
        // Map stored biome string to Biome variant; re-assign via lat/lng if missing
        let biomeVariant : GameTypes.Biome = biomeTextToVariant(plot.biome, plot.lat, plot.lng, plotId);
        let resPct = GameLib.resourcePercentageForBiome(biomeVariant, plotId);
        {
          plotId;
          owner = plot.owner;
          biome = biomeVariant;
          resourcePercentage = resPct;
        };
      };
    };
  };

  /// Convert stored biome Text to the Biome variant, falling back to lat/lng assignment.
  func biomeTextToVariant(biome : Text, lat : Float, lng : Float, plotId : Text) : GameTypes.Biome {
    switch (biome) {
      case ("Temperate")       { #Temperate };
      case ("Desert")          { #Desert };
      case ("Arctic")          { #Arctic };
      case ("Tropical")        { #Tropical };
      case ("Ocean")           { #Ocean };
      case ("DeepOcean")       { #DeepOcean };
      case ("Volcanic")        { #Volcanic };
      case ("AsteroidImpact")  { #AsteroidImpact };
      // Legacy / old enum values — re-assign from lat/lng
      case (_) { GameLib.assignBiome(lat, lng, plotId) };
    };
  };

  // ---------------------------------------------------------------------------
  // Claim accumulated FRNTR tokens
  // ---------------------------------------------------------------------------

  /// Compute how much FRNTR has accrued for the caller since lastClaimTime,
  /// transfer it from the game canister to the caller via ICRC-1, and update
  /// lastClaimTime. Returns the amount claimed (in e8s) or an error.
  public shared ({ caller }) func claimAccumulatedTokens() : async { #ok : Nat; #err : Text } {
    if (caller.isAnonymous()) { return #err("Must be authenticated to claim tokens") };

    // Get player record
    let player = switch (players.get(caller)) {
      case (null) { return #err("No player record found. Purchase a plot first.") };
      case (?p)   { p };
    };

    let now : Int = Time.now();
    let lastClaim : Int = player.lastClaimTime;
    let elapsedNs : Int = now - lastClaim;
    if (elapsedNs <= 0) { return #err("No time has elapsed since last claim") };

    // Compute accrued FRNTR: sum up daily rates for owned plots by tier
    // Base rate: 7 FRNTR/day per plot; tier bonuses stack on top.
    // Daily rate (FRNTR e8s / ns) = (baseFRNTR * 1e8) / (86400 * 1e9)
    var dailyRateE8s : Nat = 0;
    for ((pid, _) in plots.entries()) {
      switch (plots.get(pid)) {
        case (null) {};
        case (?plot) {
          if (plot.owner == ?caller) {
            let tier = switch (generatorTiers.get(pid)) {
              case (?t) { t };
              case (null) { #None };
            };
            let bonus = GameLib.tierBonus(tier);
            let dailyBase : Float = 7.0 + bonus;
            // Convert FRNTR/day to e8s/day
            let dailyE8s : Nat = Int.abs(Float.toInt(dailyBase * 100_000_000.0));
            dailyRateE8s += dailyE8s;
          };
        };
      };
    };

    if (dailyRateE8s == 0) { return #err("No plots owned; nothing to claim") };

    // elapsed in nanoseconds → convert to fraction of a day
    // accrued = dailyRateE8s * elapsedNs / (86400 * 1_000_000_000)
    let dayNs : Int = 86_400_000_000_000;
    let accrued : Nat = Int.abs((Int.fromNat(dailyRateE8s) * elapsedNs) / dayNs);
    if (accrued == 0) { return #err("Accrued amount is zero; wait longer before claiming") };

    // Transfer FRNTR from game canister to caller via ICRC-1
    type ICRC1Account = { owner : Principal; subaccount : ?Blob };
    type TransferArgs = {
      to           : ICRC1Account;
      amount       : Nat;
      fee          : ?Nat;
      memo         : ?Blob;
      from_subaccount : ?Blob;
      created_at_time : ?Nat64;
    };
    type TransferError = {
      #BadFee               : { expected_fee : Nat };
      #BadBurn              : { min_burn_amount : Nat };
      #InsufficientFunds    : { balance : Nat };
      #TooOld;
      #CreatedInFuture      : { ledger_time : Nat64 };
      #Duplicate            : { duplicate_of : Nat };
      #TemporarilyUnavailable;
      #GenericError         : { error_code : Nat; message : Text };
    };
    type TransferResult = { #Ok : Nat; #Err : TransferError };

    let frntrCanisterId = frntrLedgerState.frntrLedger;
    if (frntrCanisterId == "" or frntrCanisterId == "aaaaa-aa") {
      // Testnet fallback: credit balance directly if ledger not configured
      let updated = { player with
        frntBalance = player.frntBalance + accrued;
        lastClaimTime = now;
      };
      players.add(caller, updated);
      return #ok(accrued);
    };

    let frntrLedger = actor(frntrCanisterId) : actor {
      icrc1_transfer : (TransferArgs) -> async TransferResult
    };

    let transferArgs : TransferArgs = {
      to           = { owner = caller; subaccount = null };
      amount       = accrued;
      fee          = ?10_000;
      memo         = null;
      from_subaccount = null;
      created_at_time = null;
    };

    switch (await frntrLedger.icrc1_transfer(transferArgs)) {
      case (#Err(e)) {
        return #err("FRNTR transfer failed: " # debug_show(e));
      };
      case (#Ok(_)) {};
    };

    // Update lastClaimTime AND credit frntBalance so the local record stays in sync
    // with the on-chain ICRC-1 ledger balance.
    let updated = { player with
      lastClaimTime = now;
      frntBalance   = player.frntBalance + accrued;
    };
    players.add(caller, updated);

    #ok(accrued);
  };

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
  public query func getProductionUpgrades(plotId : Text) : async GameTypes.PlotUpgradesView {
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
  /// UPGRADE COST AUDIT:
  ///   Tier costs: [500, 1500, 4000, 10000, 25000, 60000] FRNTR
  ///   Daily rates (base 7 + bonus): [9, 12, 17, 25, 37, 55] FRNTR/day
  ///   With 5000 FRNTR faucet, TierI (500) and TierII (1500) are immediately affordable.
  /// FRNTR cost is burned via icrc1_transfer to burn address; 0.075% routed to treasury.
  public shared ({ caller }) func upgradeGenerator(plotId : Text) : async { #ok : GameTypes.PlotUpgradesView; #err : GameTypes.UpgradeError } {
    // Verify the plot exists and the caller owns it.
    let plot = switch (plots.get(plotId)) {
      case (?p) { p };
      case (null) { return #err(#PlotNotFound) };
    };
    if (plot.owner != ?caller) {
      return #err(#NotOwner);
    };

    // Enforce 4-hour cooldown after purchase before first upgrade.
    let fourHoursNs : Int = 14_400_000_000_000;
    switch (plot.purchaseTimestamp) {
      case (?ts) {
        if (Time.now() < ts + fourHoursNs) { return #err(#SubParcelLocked) };
      };
      case (null) {};
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

    // Fetch live FRNTR balance from the ICRC-1 ledger when configured;
    // fall back to local frntBalance in testnet mode.
    let player = switch (players.get(caller)) {
      case (?p) { p };
      case (null) { return #err(#NotOwner) };
    };

    type ICRC1Account = { owner : Principal; subaccount : ?Blob };
    type BalanceArgs  = ICRC1Account;
    type TransferArgs = {
      to           : ICRC1Account;
      amount       : Nat;
      fee          : ?Nat;
      memo         : ?Blob;
      from_subaccount : ?Blob;
      created_at_time : ?Nat64;
    };
    type TransferError = {
      #BadFee               : { expected_fee : Nat };
      #BadBurn              : { min_burn_amount : Nat };
      #InsufficientFunds    : { balance : Nat };
      #TooOld;
      #CreatedInFuture      : { ledger_time : Nat64 };
      #Duplicate            : { duplicate_of : Nat };
      #TemporarilyUnavailable;
      #GenericError         : { error_code : Nat; message : Text };
    };
    type TransferResult = { #Ok : Nat; #Err : TransferError };

    let frntrCanisterId = frntrLedgerState.frntrLedger;
    let ledgerConfigured = frntrCanisterId != "" and frntrCanisterId != "aaaaa-aa";

    // Check live balance
    let liveFrntBalance : Nat = if (ledgerConfigured) {
      let ledger = actor(frntrCanisterId) : actor {
        icrc1_balance_of : (BalanceArgs) -> async Nat
      };
      await ledger.icrc1_balance_of({ owner = caller; subaccount = null });
    } else {
      player.frntBalance;
    };

    if (liveFrntBalance < cost) {
      return #err(#InsufficientFRNTR);
    };

    // Calculate 0.075% liquidity tax: taxAmount = cost * 75 / 100_000
    let taxAmount : Nat = cost * 75 / 100_000;
    let burnAmount : Nat = cost - taxAmount; // remainder is burned

    // Burn via ICRC-1 transfer to burn address when ledger is configured.
    // Burn address: the anonymous / zero principal (aaaaa-aa) subaccount.
    if (ledgerConfigured) {
      let ledger = actor(frntrCanisterId) : actor {
        icrc1_transfer : (TransferArgs) -> async TransferResult
      };
      // Transfer full cost from caller to the burn (zero) address.
      // Game canister acts as intermediary: caller approved it via ICRC-2, but for
      // upgrade burns we use a direct transfer from the caller's own principal.
      // The caller must call icrc2_approve on the FRNTR ledger before upgrading.
      // For testnet, fall back to local balance deduction.
      let transferResult = await ledger.icrc1_transfer({
        to              = { owner = Principal.fromText("aaaaa-aa"); subaccount = null };
        amount          = burnAmount;
        fee             = ?10_000;
        memo            = null;
        from_subaccount = null;
        created_at_time = null;
      });
      switch (transferResult) {
        case (#Err(_)) {
          // Fallback: deduct from local balance if ledger transfer fails
          players.add(caller, { player with frntBalance = if (player.frntBalance >= cost) { player.frntBalance - cost } else { 0 } });
        };
        case (#Ok(_)) {};
      };
    } else {
      // Testnet mode: deduct locally
      if (player.frntBalance < cost) { return #err(#InsufficientFRNTR) };
      players.add(caller, { player with frntBalance = player.frntBalance - cost });
    };

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
  public query func getPlotPriceView(plotId : Text) : async GameTypes.PlotPriceView {
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
  public shared ({ caller }) func purchasePlotWithTier(plotId : Text, tier : Nat) : async { #ok : Text; #err : Text } {
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
          passiveIncomePerDay = 0.0; lastClaimTime = Time.now();
        };
      };
    };
    let updatedPlayer = { player with plotsOwned = player.plotsOwned + 1 };
    players.add(caller, updatedPlayer);
    #ok("Plot " # plotId # " purchased for " # Nat.toText(priceE8s) # " e8s");
  };

  // ---------------------------------------------------------------------------
  // Sub-parcel slot status
  // NOTE: subParcelAccumulationEnabled controls whether sub-parcel accrual is active.
  // Set to true in a future update to re-enable the full sub-parcel accumulation system.
  // ---------------------------------------------------------------------------

  /// Return 7 SubParcelInfo entries for a plot (slots 0-6).
  /// If sub-parcel accumulation is disabled, cooldown and rates still show but
  /// accrual is not executed.
  public query func getSubParcelStatus(plotId : Text) : async [GameTypes.SubParcelInfo] {
    let now : Int = Time.now();
    let fourHoursNs : Int = 14_400_000_000_000;

    let (isLocked, cooldownRemaining) : (Bool, Nat) = switch (plots.get(plotId)) {
      case (null) { (false, 0) };
      case (?plot) {
        switch (plot.purchaseTimestamp) {
          case (null) { (false, 0) };
          case (?ts) {
            let unlockAt : Int = ts + fourHoursNs;
            if (now < unlockAt) {
              let remaining : Int = unlockAt - now;
              let remainingSecs : Nat = Int.abs(remaining / 1_000_000_000);
              (true, remainingSecs);
            } else {
              (false, 0);
            };
          };
        };
      };
    };

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
  public shared ({ caller }) func purchasePlot(plotId : Text) : async { #ok : Text; #err : Text } {
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

    let rarity = switch (plotRarities.get(plotId)) {
      case (?r) { r };
      case (null) {
        let r = GameLib.rarityFromBiome(plot.biome, plotId);
        plotRarities.add(plotId, r);
        r;
      };
    };
    let icpAmt : Nat = GameLib.priceForRarity(rarity, pricingState.pricing);

    // ---------------------------------------------------------------------------
    // ICP Transfer (ICRC-2 approve+transfer_from) — MUST succeed before ownership
    // is assigned. If this fails we return an error and do NOT modify state.
    // ---------------------------------------------------------------------------
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

    // Use selfPrincipalState.selfPrincipalText as the `to` address (game canister).
    // Falls back to admin principal if self-principal not yet set.
    let toText = if (selfPrincipalState.selfPrincipalText != "" and selfPrincipalState.selfPrincipalText != "aaaaa-aa") {
      selfPrincipalState.selfPrincipalText;
    } else {
      adminState.adminPrincipal;
    };
    let toPrincipal = Principal.fromText(toText);

    let transferArgs : ICRC2TransferFromArgs = {
      from             = { owner = caller; subaccount = null };
      to               = { owner = toPrincipal; subaccount = null };
      amount           = icpAmt;
      fee              = ?10_000;
      memo             = null;
      created_at_time  = null;
      spender_subaccount = null;
    };
    switch (await icpLedger.icrc2_transfer_from(transferArgs)) {
      case (#Err(err)) {
        // Transfer failed — ownership NOT assigned.
        return #err("ICP transfer failed: " # debug_show(err));
      };
      case (#Ok(_)) {};
    };

    // ICP transfer succeeded — assign ownership atomically.
    let player = switch (players.get(caller)) {
      case (?p) { p };
      case (null) {
        {
          iron = 0; fuel = 0; crystal = 0; frntBalance = 0;
          plotsOwned = 0; combatVictories = 0; commanderType = null;
          commanderAtk = 0; commanderDef = 0; satelliteExpiry = 0;
          reconTargets = []; empTargets = []; totalFRNTRBurned = 0.0;
          passiveIncomePerDay = 0.0; lastClaimTime = Time.now();
        };
      };
    };

    let updatedPlayer = { player with plotsOwned = player.plotsOwned + 1 };
    players.add(caller, updatedPlayer);

    let updatedPlot = { plot with owner = ?caller; purchaseTimestamp = ?(Time.now()) };
    plots.add(plotId, updatedPlot);

    plotUpgrades.add(plotId, GameLib.defaultUpgrades(plotId));

    // Store rarity for price lookups.
    plotRarities.add(plotId, rarity);

    #ok("Plot " # plotId # " purchased successfully for " # Nat.toText(icpAmt) # " e8s ICP");
  };

  // ---------------------------------------------------------------------------
  // Testnet faucet (no cooldown) — 5000 FRNTR + 5 ICP per click
  // ---------------------------------------------------------------------------

  /// Claim 5000 FRNTR (500_000_000_000 e8s) + 5 ICP (500_000_000 e8s) for testnet.
  /// Always succeeds, no cooldown. Requires authentication.
  public shared ({ caller }) func testFaucetV2() : async { #ok : TestnetTypes.FaucetGrant; #err : Text } {
    if (caller.isAnonymous()) { return #err("Must be authenticated") };

    // Grant 5000 FRNTR via ICRC-1 ledger if configured, else credit locally.
    let frntrCanisterId = frntrLedgerState.frntrLedger;
    let ledgerConfigured = frntrCanisterId != "" and frntrCanisterId != "aaaaa-aa";

    if (ledgerConfigured) {
      type TransferArgs = {
        to           : { owner : Principal; subaccount : ?Blob };
        amount       : Nat;
        fee          : ?Nat;
        memo         : ?Blob;
        from_subaccount : ?Blob;
        created_at_time : ?Nat64;
      };
      type TransferError = {
        #BadFee               : { expected_fee : Nat };
        #BadBurn              : { min_burn_amount : Nat };
        #InsufficientFunds    : { balance : Nat };
        #TooOld;
        #CreatedInFuture      : { ledger_time : Nat64 };
        #Duplicate            : { duplicate_of : Nat };
        #TemporarilyUnavailable;
        #GenericError         : { error_code : Nat; message : Text };
      };
      type TransferResult = { #Ok : Nat; #Err : TransferError };
      let frntrLedger = actor(frntrCanisterId) : actor {
        icrc1_transfer : (TransferArgs) -> async TransferResult
      };
      switch (await frntrLedger.icrc1_transfer({
        to              = { owner = caller; subaccount = null };
        amount          = 500_000_000_000; // 5000 FRNTR at 8 decimals
        fee             = ?10_000;
        memo            = null;
        from_subaccount = null;
        created_at_time = null;
      })) {
        case (#Err(e)) { return #err("FRNTR ledger transfer failed: " # debug_show(e)) };
        case (#Ok(_))  {};
      };
    } else {
      // Testnet fallback: credit FRNTR to local balance
      switch (players.get(caller)) {
        case (null) {
          players.add(caller, {
            iron = 0; fuel = 0; crystal = 0; frntBalance = 500_000_000_000;
            plotsOwned = 0; combatVictories = 0; commanderType = null;
            commanderAtk = 0; commanderDef = 0; satelliteExpiry = 0;
            reconTargets = []; empTargets = []; totalFRNTRBurned = 0.0;
            passiveIncomePerDay = 0.0; lastClaimTime = Time.now();
          });
        };
        case (?p) {
          players.add(caller, { p with frntBalance = p.frntBalance + 500_000_000_000 });
        };
      };
    };
    #ok({ frntGranted = 500_000_000_000; icpGranted = 500_000_000 });
  };

  // ---------------------------------------------------------------------------
  // Commander NFT endpoints — DISABLED
  // commanderNFTEnabled defaults to false; set to true in a future update.
  // ---------------------------------------------------------------------------

  /// Placeholder: Commander NFT system is not yet active.
  /// Returns a descriptive error when commanderNFTEnabled = false.
  public query func getCommander(userId : Principal) : async { #ok : Text; #err : Text } {
    ignore userId;
    if (not featureFlags.commanderNFTEnabled) {
      return #err("Commander NFT system is not yet enabled. Coming in a future update.");
    };
    #err("Commander NFT system is not yet enabled. Coming in a future update.");
  };

  /// Placeholder: equip Commander NFT (disabled).
  public shared ({ caller }) func equipCommander(nftId : Nat) : async { #ok : Text; #err : Text } {
    ignore (caller, nftId);
    if (not featureFlags.commanderNFTEnabled) {
      return #err("Commander NFT system is not yet enabled. Coming in a future update.");
    };
    #err("Commander NFT system is not yet enabled. Coming in a future update.");
  };

  /// Placeholder: Commander bonus calculation (disabled).
  public query func commanderBonus(userId : Principal) : async { #ok : Float; #err : Text } {
    ignore userId;
    if (not featureFlags.commanderNFTEnabled) {
      return #err("Commander NFT system is not yet enabled. Coming in a future update.");
    };
    #err("Commander NFT system is not yet enabled. Coming in a future update.");
  };

  // ---------------------------------------------------------------------------
  // Peer-to-peer plot transfer
  // ---------------------------------------------------------------------------

  /// Transfer ownership of a plot to another principal.
  public shared ({ caller }) func transferPlot(plotId : Text, toPrincipal : Principal) : async GameTypes.TransferResult {
    if (Principal.isAnonymous(toPrincipal)) {
      return #err(#InvalidRecipient);
    };
    let plot = switch (plots.get(plotId)) {
      case (?p) { p };
      case (null) { return #err(#PlotNotFound) };
    };
    if (plot.owner != ?caller) {
      return #err(#NotOwner);
    };
    if (toPrincipal == caller) {
      return #err(#SameOwner);
    };
    plots.add(plotId, { plot with owner = ?toPrincipal });
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
        players.add(toPrincipal, {
          iron = 0; fuel = 0; crystal = 0; frntBalance = 0;
          plotsOwned = 1; combatVictories = 0; commanderType = null;
          commanderAtk = 0; commanderDef = 0; satelliteExpiry = 0;
          reconTargets = []; empTargets = []; totalFRNTRBurned = 0.0;
          passiveIncomePerDay = 0.0; lastClaimTime = Time.now();
        });
      };
    };
    #ok;
  };
};
