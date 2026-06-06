
import Principal "mo:core/Principal";
import Nat "mo:core/Nat";
import Nat32 "mo:core/Nat32";
import Char "mo:core/Char";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Int "mo:core/Int";
import Text "mo:core/Text";
import Iter "mo:core/Iter";
import Array "mo:core/Array";
import Order "mo:core/Order";
import Time "mo:core/Time";
import Float "mo:core/Float";

import GameLib "lib/game";
import GameTypes "types/game";
import CommonTypes "types/common";
import TestnetTypes "types/testnet";
import SessionTypes "types/session";
import SessionLib "lib/session";
import TestnetLib "lib/testnet";
import CoreTypes "types/core";
import CoreLib "lib/core";
import CoreApiMixin "mixins/core-api";
import TokenTypes "token/types";
import FrntrLedgerApiMixin "mixins/frntr-ledger-api";
import Blob "mo:core/Blob";
import Debug "mo:core/Debug";
import Migration "migration";




(with migration = Migration.run)
actor {
  // TODO: MAINNET — verify admin principal and treasury canister principal below before go-live.
  let TESTNET_MODE : Bool = false; // Set to true only for local testnet development

  type Defenses = {
    turrets : Nat;
    shields : Nat;
    walls : Nat;
  };

  type Facilities = {
    electricityPlant : Bool;
    blockchainNode : Bool;
    dataCentre : Bool;
    aiLab : Bool;
  };

  // ─── SubParcel type ─────────────────────────────────────────────────────
  type SubParcel = {
    subParcelId      : Text;
    plotId           : Text;
    slotIndex        : Nat;  // 0 = center Nexus, 1-6 = surrounding slots
    specialization   : Text;
    building         : ?Text;
    cooldownEnds     : Int;
  };

  type PlotState = {
    plotId : Text;  // H3 hex string
    biome : Text;
    richness : Nat;
    lat : Float;
    lng : Float;
    owner : ?Principal;
    nftTokenId : ?Nat;
    iron : Nat;
    fuel : Nat;
    crystal : Nat;
    lastTick : Int;
    defenses : Defenses;
    facilities : Facilities;
    attackCooldown : Int;
    faction : ?Text;
    morale : Nat;
    interceptorSystem : ?Text;
    purchaseTimestamp : ?Int;
    nexusElectricityLevel : Nat;
  };

type PlayerState = {
    iron : Nat;
    fuel : Nat;
    crystal : Nat;
    frntBalance : Nat;
    icpBalance : Nat;
    plotsOwned : Nat;
    combatVictories : Nat;
    commanderType : ?Text;
    commanderAtk : Nat;
    commanderDef : Nat;
    satelliteExpiry : Int;
    reconTargets : [(Nat, Int)];
    empTargets : [(Nat, Int)];
    totalFRNTRBurned : Float;
    passiveIncomePerDay : Float;
    lastClaimTime : Int;  // nanosecond timestamp of last claimAccumulatedTokens call
  };

  // ─── ICRC-2 types for ICP ledger transfer_from ────────────────────────────
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

  let ICP_LEDGER_ID : Text = "ryjl3-tyaaa-aaaaa-aaaba-cai";

  type CombatEvent = {
    timestamp : Int;
    attacker : Principal;
    fromPlot : Text;
    toPlot : Text;
    success : Bool;
    atkPower : Nat;
    defPower : Nat;
    intercepted : Bool;
    interceptorType : ?Text;
    missileType : ?Text;
  };

  type LeaderEntry = {
    principal : Principal;
    plotsOwned : Nat;
    frntEarned : Nat;
    combatVictories : Nat;
  };

  type OrbitalEvent = {
    eventType : Text;
    startTime : Int;
    duration : Int;
    affectedBiomes : [Text];
  };

  module LeaderEntry {
    public func compareByFrntEarned(a : LeaderEntry, b : LeaderEntry) : Order.Order {
      Nat.compare(b.frntEarned, a.frntEarned);
    };
  };

  type MissileStats = {
    cost : Nat;
    atkPower : Nat;
  };

  // ─── Stable backing arrays (survive canister upgrades) ──────────────────
  stable var stablePlots           : [(Text, PlotState)]                   = [];
  // stablePlayers holds current PlayerState entries; migrated from old PlayerState on first upgrade.
  stable var stablePlayers         : [(Principal, PlayerState)]            = [];
  stable var stableCombatLog       : [(Int, CombatEvent)]                  = [];
  stable var stableLeaderboard     : [(Principal, LeaderEntry)]            = [];
  stable var stableInterceptors    : [(Text, Text)]                        = [];
  stable var stableGeneratorTiers  : [(Text, GameTypes.GeneratorTier)]     = [];
  stable var stablePlotRarities    : [(Text, CommonTypes.PlotRarity)]      = [];
  stable var stableUsernames       : [(Principal, Text)]                   = [];
  stable var stableFaucetClaims    : [(Principal, Nat)]                    = [];
  stable var stableClaimTimes      : [(Principal, Int)]                    = []; // lastClaimAccumulatedTokens timestamp per player
  stable var stableStatsState      : (Nat, Nat, Nat)                       = (0, 0, 0); // (totalFRNTRBurned, totalFRNTRMined, activePlayers)
  stable var stablePlotSoldCount   : Nat                                   = 0;
  stable var stableSubParcels      : [(Text, SubParcel)]                   = [];
  stable var stablePlotSoldState   : Nat                                   = 0; // alias for stablePlotSoldCount
  stable var stableTreasuryPots    : (Nat, Nat, Nat)                       = (0, 0, 0);
  // Survey records: surveyKey -> Survey.  SurveyKey = plotId # "::" # principalText
  stable var stableSurveys         : [(Text, GameTypes.Survey)]             = [];
  // Feature flags — set to true in future updates to re-enable deferred systems.
  // subParcelAccumulationEnabled: re-enable for the full sub-parcel accumulation system.
  stable var subParcelAccumulationEnabled : Bool = false;
  // commanderNFTEnabled: re-enable when Commander NFT system launches.
  stable var commanderNFTEnabled : Bool = false;

  // ─── Heap maps — loaded from stable arrays on init ───────────────────────
  let plots          = Map.fromIter<Text, PlotState>(stablePlots.vals());
  let players        = Map.fromIter<Principal, PlayerState>(stablePlayers.vals());
  let combatLog      = Map.fromIter<Int, CombatEvent>(stableCombatLog.vals());
  let _leaderboard   = Map.fromIter<Principal, LeaderEntry>(stableLeaderboard.vals());
  let interceptors   = Map.fromIter(stableInterceptors.vals()); // plotId (Text) -> interceptorType

  // Generator tier per plot (keyed by H3 Text plot ID)
  let generatorTiers = Map.fromIter<Text, GameTypes.GeneratorTier>(stableGeneratorTiers.vals());
  // Plot rarities for price lookups
  let _plotRarities  = Map.fromIter<Text, CommonTypes.PlotRarity>(stablePlotRarities.vals());
  // Username registry: principal -> username
  let usernames      = Map.fromIter(stableUsernames.vals());
  // Faucet claims: principal -> claim count
  let faucetClaims   = Map.fromIter<Principal, Nat>(stableFaucetClaims.vals());
  // Claim timestamps: principal -> nanosecond timestamp of last claimAccumulatedTokens
  let claimTimes     = Map.fromIter(stableClaimTimes.vals());
  // Sub-parcels map: subParcelId (Text) -> SubParcel
  let subParcels     = Map.fromIter<Text, SubParcel>(stableSubParcels.vals());
  // Survey map: surveyKey -> Survey
  let surveys        = Map.fromIter<Text, GameTypes.Survey>(stableSurveys.vals());

  // Global stats tracking — loaded from stable tuple
  let statsState = {
    var totalFRNTRBurned : Nat = stableStatsState.0;
    var totalFRNTRMined  : Nat = stableStatsState.1;
    var activePlayers    : Nat = stableStatsState.2;
  };
  // Plot sold counter — loaded from stable var
  let plotSoldState = { var count : Nat = stablePlotSoldCount };
  /// Helper: build a TokenTypes.Account for a principal with no subaccount.
  private func toFrntrAccount(p : Principal) : TokenTypes.Account {
    { owner = p; subaccount = null };
  };

  /// Helper: check if the FRNTR ledger has been set (i.e. not the placeholder).
  private func frntrLedgerIsSet() : Bool {
    frntrLedgerState.frntrLedger != "aaaaa-aa";
  };
  // Pricing config (default midpoints)
  let pricingState = { var pricing : CommonTypes.PlotPricing = CommonTypes.defaultPricing };

  // Game canister's own principal — used for ICRC-2 transfer_from `to` field.
  // This is set once at actor init and never changes.
  stable var selfPrincipalText : Text = "aaaaa-aa";
  public shared ({ caller }) func setSelfPrincipal() : async () {
    // Anyone can call this once to seed the self-principal (idempotent).
    // After the first call the value is stable and survives upgrades.
    if (selfPrincipalText == "aaaaa-aa") {
      selfPrincipalText := caller.toText();
    };
  };
  // Admin override for self-principal in case the above produces wrong value.
  public shared ({ caller }) func setGameCanisterPrincipal(p : Text) : async () {
    if (caller.toText() != adminState.adminPrincipal) {
      Runtime.trap("Unauthorized");
    };
    selfPrincipalText := p;
  };
  public query func getGameCanisterPrincipal() : async Text { selfPrincipalText };

  // Admin state -- wrapped in a record so it can be mutated via reference
  let adminState = { var adminPrincipal : Text = "cjdkt-wqjqk-jd6xu-uc2jl-lgueg-v4kum-o32mf-mwl7v-63yjp-26gyk-mae" };
  // Treasury canister principal -- update after treasury canister is deployed
  let treasuryState = { var treasuryPrincipal : Text = "cjdkt-wqjqk-jd6xu-uc2jl-lgueg-v4kum-o32mf-mwl7v-63yjp-26gyk-mae" };
  // FRNTR token ledger canister principal -- set via setFrntrLedger after token canister is deployed
  let frntrLedgerState = { var frntrLedger : Text = "aaaaa-aa"; var adminPrincipal : Text = adminState.adminPrincipal };

  // ─── FRNTR ledger management mixin ───────────────────────────────────────
  include FrntrLedgerApiMixin(frntrLedgerState);

  // Treasury pots tracking ICP from plot purchases (25/25/50 split).
  // Amounts are in e8s (200_000_000 = 2 ICP).
  let treasuryPots = {
    var devPot        : Nat = 0;
    var leaderboardPot : Nat = 0;
    var liquidityPot  : Nat = 0;
  };
  // ─── Core stats / tokenomics mixin ───────────────────────────────────────
  include CoreApiMixin(statsState, plotSoldState, generatorTiers, plots);


  // ─── Session / principal display ─────────────────────────────────────────

  /// Returns the caller's principal display info for wallet/identity UI.
  public query ({ caller }) func getPrincipal() : async SessionTypes.PrincipalDisplay {
    SessionLib.display(caller);
  };

  // ─── Testnet faucet (5000 FRNTR + 5 ICP per click) ─────────────────────

  /// Testnet faucet: grants 5000 FRNTR (500_000_000_000 e8s) + 5 ICP (500_000_000 e8s) per click.
  /// Transfers FRNTR via ICRC-1 ledger (if set) and 5 ICP via ICP ledger.
  /// Auto-creates a player record if one doesn't exist.
  /// No cooldown. TESTNET_MODE=true only.
  public shared ({ caller }) func testFaucetV2() : async TestnetTypes.FaucetResult {
    if (not TESTNET_MODE) { return #err("Faucet only available in testnet mode") };
    if (caller.isAnonymous()) { return #err("Must be authenticated") };
    let player = switch (players.get(caller)) {
      case (null) {
        statsState.activePlayers += 1;
        let np : PlayerState = { (emptyPlayerState()) with frntBalance = 600 };
        players.add(caller, np);
        np;
      };
      case (?p) { p };
    };
    let grant = TestnetLib.buildGrant();
    // Transfer 500 FRNTR via ICRC-1 ledger if configured, otherwise update local balance
    if (frntrLedgerIsSet()) {
      let tokenActor = actor(frntrLedgerState.frntrLedger) : actor {
        icrc1_transfer : (TokenTypes.TransferArg) -> async TokenTypes.TransferResult
      };
      let transferArg : TokenTypes.TransferArg = {
        from_subaccount = null;
        to = toFrntrAccount(caller);
        amount = 500_000_000_000; // 5000 FRNTR at 8 decimals
        fee = null;
        memo = null;
        created_at_time = null;
      };
      switch (await tokenActor.icrc1_transfer(transferArg)) {
        case (#Ok(_)) {};
        case (#Err(e)) {
          return #err("FRNTR ledger transfer failed: " # debug_show(e));
        };
      };
    } else {
      // Fallback: increment local FRNTR counter
      players.add(caller, {
        player with
        frntBalance = player.frntBalance + grant.frntGranted;
      });
      statsState.totalFRNTRMined += grant.frntGranted;
    };
    // Transfer 2 ICP (200_000_000 e8s) to caller via ICP ledger
    let icpLedger = actor(ICP_LEDGER_ID) : actor {
      icrc1_transfer : ({
        from_subaccount : ?Blob;
        to              : { owner : Principal; subaccount : ?Blob };
        amount          : Nat;
        fee             : ?Nat;
        memo            : ?Blob;
        created_at_time : ?Nat64;
      }) -> async { #Ok : Nat; #Err : { #BadFee : { expected_fee : Nat }; #BadBurn : { min_burn_amount : Nat }; #InsufficientFunds : { balance : Nat }; #TooOld; #CreatedInFuture : { ledger_time : Nat64 }; #Duplicate : { duplicate_of : Nat }; #TemporarilyUnavailable; #GenericError : { error_code : Nat; message : Text } } }
    };
    switch (await icpLedger.icrc1_transfer({
      from_subaccount = null;
      to              = { owner = caller; subaccount = null };
      amount          = 500_000_000; // 5 ICP in e8s
      fee             = ?10_000;
      memo            = null;
      created_at_time = null;
    })) {
      case (#Ok(_))  {};
      case (#Err(e)) {
        // ICP transfer failed — FRNTR was already granted; surface warning in result
        // but do not crash. The caller can retry the ICP portion or use faucet again.
        ignore e; // error is non-fatal; FRNTR grant succeeded
      };
    };
    ignore TestnetLib.recordClaim(faucetClaims, caller, Time.now());
    #ok(grant);
  };

  /// Returns total faucet claims for a principal (debug/analytics).
  public query func getFaucetClaims(principal : Principal) : async TestnetTypes.FaucetClaimSummary {
    switch (TestnetLib.getClaimCount(faucetClaims, principal)) {
      case (?summary) { summary };
      case (null) {
        { principal = principal.toText(); totalClaims = 0; lastClaim = null };
      };
    };
  };

  // ─── Claim accumulated FRNTR tokens ─────────────────────────────────────────────

  /// Compute how much FRNTR has accrued for the caller since their lastClaimTime,
  /// transfer it from the game canister to the caller's principal via ICRC-1,
  /// update lastClaimTime to now, and return the claimed amount (in e8s) or an error.
  public shared ({ caller }) func claimAccumulatedTokens() : async { #ok : Nat; #err : Text } {
    if (caller.isAnonymous()) { return #err("Must be authenticated to claim tokens") };

    let player = switch (players.get(caller)) {
      case (null) { return #err("No player record found. Purchase a plot first.") };
      case (?p)   { p };
    };

    let now : Int = Time.now();
    let lastClaim : Int = switch (claimTimes.get(caller)) { case (?t) t; case (null) 0 };
    let elapsedNs : Int = now - lastClaim;
    if (elapsedNs <= 0) { return #err("No time has elapsed since last claim") };

    // Sum daily rates for all plots owned by caller.
    // Base rate: 7 FRNTR/day per plot; generator tier bonuses stack on top.
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
            // Convert FRNTR/day to e8s/day (1 FRNTR = 100_000_000 e8s)
            let dailyE8s : Nat = Int.abs(Float.toInt(dailyBase * 100_000_000.0));
            dailyRateE8s += dailyE8s;
          };
        };
      };
    };

    if (dailyRateE8s == 0) { return #err("No plots owned; nothing to claim") };

    // accrued = dailyRateE8s * elapsedNs / (86400 * 1_000_000_000)
    let dayNs : Int = 86_400_000_000_000;
    let accrued : Nat = Int.abs((Int.fromNat(dailyRateE8s) * elapsedNs) / dayNs);
    if (accrued == 0) { return #err("Accrued amount is zero; wait longer before claiming") };

    // Transfer accrued FRNTR to caller via ICRC-1 ledger if configured
    if (frntrLedgerIsSet()) {
      let tokenActor = actor(frntrLedgerState.frntrLedger) : actor {
        icrc1_transfer : (TokenTypes.TransferArg) -> async TokenTypes.TransferResult
      };
      let transferArg : TokenTypes.TransferArg = {
        from_subaccount = null;
        to = toFrntrAccount(caller);
        amount = accrued;
        fee = null;
        memo = null;
        created_at_time = null;
      };
      switch (await tokenActor.icrc1_transfer(transferArg)) {
        case (#Err(e)) {
          return #err("FRNTR transfer failed: " # debug_show(e));
        };
        case (#Ok(_)) {};
      };
    } else {
      // Fallback: credit directly to local balance
      players.add(caller, { player with frntBalance = player.frntBalance + accrued });
      statsState.totalFRNTRMined += accrued;
    };

    // Update claimTimes to now
    claimTimes.add(caller, now);
    players.add(caller, player);
    #ok(accrued);
  };

  // ─── Stress-test endpoints (TESTNET_MODE only) ───────────────────────────

  /// Rapidly mint `count` unowned plots (TESTNET_MODE only).
  public shared ({ caller }) func stressMintPlots(count : Nat) : async TestnetTypes.StressTestResult {
    if (not TESTNET_MODE) { return #err("Stress tests only available in testnet mode") };
    if (caller.isAnonymous()) { return #err("Must be authenticated") };
    var results : [TestnetTypes.StressActionResult] = [];
    var i = 0;
    while (i < count) {
      let t0 = Time.now();
      let plotId : Text = "stress_" # i.toText();
      let res : TestnetTypes.StressActionResult = try {
        plots.add(plotId, {
          plotId; biome = "Temperate"; richness = 85;
          lat = 0.0; lng = 0.0; owner = null; nftTokenId = null;
          iron = 0; fuel = 0; crystal = 0;
          lastTick = t0;
          defenses = { turrets = 0; shields = 0; walls = 0 };
          facilities = { electricityPlant = false; blockchainNode = false;
                         dataCentre = false; aiLab = false };
          attackCooldown = 0; faction = null; morale = 100;
          interceptorSystem = null; purchaseTimestamp = null;
          nexusElectricityLevel = 0;
        });
        TestnetLib.passResult("mintPlot", i, t0, Time.now());
      } catch (e) {
        TestnetLib.failResult("mintPlot", i, t0, Time.now(), "mint failed");
      };
      results := results.concat([res]);
      i += 1;
    };
    #ok(results);
  };

  /// Buy `count` plots in sequence (TESTNET_MODE only).
  public shared ({ caller }) func stressBuyPlots(count : Nat) : async TestnetTypes.StressTestResult {
    if (not TESTNET_MODE) { return #err("Stress tests only available in testnet mode") };
    if (caller.isAnonymous()) { return #err("Must be authenticated") };
    var results : [TestnetTypes.StressActionResult] = [];
    var i = 0;
    while (i < count) {
      let t0 = Time.now();
      let plotId : Text = "stress_" # i.toText();
      let res : TestnetTypes.StressActionResult = try {
        let existing = plots.get(plotId);
        switch (existing) {
          case (null) {
            plots.add(plotId, {
              plotId; biome = "Temperate"; richness = 85;
              lat = 0.0; lng = 0.0; owner = null; nftTokenId = null;
              iron = 0; fuel = 0; crystal = 0; lastTick = t0;
              defenses = { turrets = 0; shields = 0; walls = 0 };
              facilities = { electricityPlant = false; blockchainNode = false;
                             dataCentre = false; aiLab = false };
              attackCooldown = 0; faction = null; morale = 100;
              interceptorSystem = null; purchaseTimestamp = null;
              nexusElectricityLevel = 0;
            });
          };
          case (?_) {};
        };
        let plot = switch (plots.get(plotId)) {
          case (?p) { p };
          case (null) { Runtime.trap("Plot not found") };
        };
        if (plot.owner != null) {
          TestnetLib.failResult("buyPlot", i, t0, Time.now(), "plot already owned");
        } else {
          let player = switch (players.get(caller)) {
            case (?p) { p };
            case (null) {
              statsState.activePlayers += 1;
              let np : PlayerState = { (emptyPlayerState()) with frntBalance = 60_000; plotsOwned = 0 };
              players.add(caller, np);
              np;
            };
          };
          plots.add(plotId, { plot with owner = ?caller; purchaseTimestamp = ?t0 });
          players.add(caller, { player with plotsOwned = player.plotsOwned + 1 });
          plotSoldState.count += 1;
          TestnetLib.passResult("buyPlot", i, t0, Time.now());
        };
      } catch (e) {
        TestnetLib.failResult("buyPlot", i, t0, Time.now(), "buy failed");
      };
      results := results.concat([res]);
      i += 1;
    };
    #ok(results);
  };

  /// Run `count` upgrade cycles across owned plots (TESTNET_MODE only).
  public shared ({ caller }) func stressUpgradePlots(count : Nat) : async TestnetTypes.StressTestResult {
    if (not TESTNET_MODE) { return #err("Stress tests only available in testnet mode") };
    if (caller.isAnonymous()) { return #err("Must be authenticated") };
    var results : [TestnetTypes.StressActionResult] = [];
    var i = 0;
    while (i < count) {
      let t0 = Time.now();
      let plotId : Text = "stress_" # (i % 10).toText();
      let res : TestnetTypes.StressActionResult = try {
        let curTier : GameTypes.GeneratorTier = switch (generatorTiers.get(plotId)) {
          case (?t) { t };
          case (null) { #None };
        };
        let nextTier : GameTypes.GeneratorTier = switch (curTier) {
          case (#None)    { #TierI };
          case (#TierI)   { #TierII };
          case (#TierII)  { #TierIII };
          case (#TierIII) { #TierIV };
          case (#TierIV)  { #TierV };
          case (#TierV)   { #TierVI };
          case (#TierVI)  { #TierVI };
        };
        generatorTiers.add(plotId, nextTier);
        TestnetLib.passResult("upgradePlot", i, t0, Time.now());
      } catch (e) {
        TestnetLib.failResult("upgradePlot", i, t0, Time.now(), "upgrade failed");
      };
      results := results.concat([res]);
      i += 1;
    };
    #ok(results);
  };

  // ─── Admin / test-state reset ────────────────────────────────────────────

  /// Admin: clear all player state for a clean test run (TESTNET_MODE only).
  public shared ({ caller }) func resetTestState() : async TestnetTypes.ResetResult {
    if (not TESTNET_MODE) { return #err("Reset only available in testnet mode") };
    if (caller.isAnonymous()) { return #err("Must be authenticated") };
    players.remove(caller);
    faucetClaims.remove(caller);
    #ok("Test state cleared for " # caller.toText());
  };

  /// Admin: wipe all game state (plots, players, usernames, faucetClaims,
  /// generatorTiers, subParcels, statsState, plotSoldCount) back to empty.
  /// Used before migrating to mainnet for a clean slate.
  public shared ({ caller }) func resetAllData() : async () {
    if (caller.toText() != adminState.adminPrincipal) {
      Runtime.trap("Unauthorized: only admin can call resetAllData");
    };
    plots.clear();
    players.clear();
    usernames.clear();
    faucetClaims.clear();
    generatorTiers.clear();
    subParcels.clear();
    interceptors.clear();
    combatLog.clear();
    statsState.totalFRNTRBurned := 0;
    statsState.totalFRNTRMined  := 0;
    statsState.activePlayers    := 0;
    plotSoldState.count         := 0;
    treasuryPots.devPot         := 0;
    treasuryPots.leaderboardPot := 0;
    treasuryPots.liquidityPot   := 0;
  };

  func validatePlotExists(plotId : Text) : PlotState {
    switch (plots.get(plotId)) {
      case (null) { Runtime.trap("Plot does not exist: " # plotId) };
      case (?plot) { plot };
    };
  };

  public shared ({ caller }) func assignInterceptor(plotId : Text, interceptorType : Text) : async () {
    let _ = validatePlotExists(plotId);
    switch (interceptorType) {
      case ("IRON-DOME-F") { };
      case ("THAAD-X") { };
      case ("AEGIS-S") { };
      case (_) { Runtime.trap("Invalid interceptor type") };
    };
    interceptors.add(plotId, interceptorType);
  };

  public query ({ caller }) func getAssignedInterceptor(plotId : Text) : async ?Text {
    interceptors.get(plotId);
  };

  // Returns daily FRNTR rate for a plot (base 7 + nexus electricity bonus)
  // Returns daily FRNTR rate for a plot using canonical formula: base 7 + (tierIndex * 3) + nexus bonus
  func plotDailyRate(plotId : Text) : Float {
    let tierIndex : Nat = switch (generatorTiers.get(plotId)) {
      case (null)      { 0 };
      case (?#None)    { 0 };
      case (?#TierI)   { 1 };
      case (?#TierII)  { 2 };
      case (?#TierIII) { 3 };
      case (?#TierIV)  { 4 };
      case (?#TierV)   { 5 };
      case (?#TierVI)  { 6 };
    };
    let base : Float = 7.0;
    let tier : Float = (tierIndex * 3).toFloat();
    let nexus : Float = switch (plots.get(plotId)) {
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
    base + tier + nexus;
  };

  func computePassiveIncomePerDay(caller : Principal) : Float {
    var total : Float = 0.0;
    for ((plotId, plot) in plots.entries()) {
      if (plot.owner == ?caller) {
        total := total + plotDailyRate(plotId);
      };
    };
    total;
  };

  public query func getPassiveIncome(plotId : Text) : async Float {
    plotDailyRate(plotId);
  };

  /// Upgrade the generator tier for an owned plot.
  /// Deducts FRNTR cost from player balance, tracks burn, sends 0.075% liquidity tax to treasury.
  public shared ({ caller }) func upgradeGenerator(plotId : Text) : async { #ok : GameTypes.PlotUpgradesView; #err : GameTypes.UpgradeError } {
    if (caller.isAnonymous()) { return #err(#NotOwner) };

    let plot = switch (plots.get(plotId)) {
      case (null) { return #err(#PlotNotFound) };
      case (?p)   { p };
    };

    if (plot.owner != ?caller) { return #err(#NotOwner) };

    // Check 4-hour cooldown after purchase
    let fourHoursNs : Int = 14_400_000_000_000;
    switch (plot.purchaseTimestamp) {
      case (?ts) {
        if (Time.now() < ts + fourHoursNs) { return #err(#SubParcelLocked) };
      };
      case (null) {};
    };

    let curTier : GameTypes.GeneratorTier = switch (generatorTiers.get(plotId)) {
      case (null)  { #None };
      case (?t)    { t };
    };

    let nextTier : GameTypes.GeneratorTier = switch (GameLib.nextTier(curTier)) {
      case (null)  { return #err(#AlreadyMaxTier) };
      case (?t)    { t };
    };

    let cost : Nat = GameLib.tierCost(nextTier);

    let player = switch (players.get(caller)) {
      case (null) { return #err(#NotOwner) };
      case (?p)   { p };
    };

    // Fetch live FRNTR balance from the ICRC-1 ledger (bypasses stale player.frntBalance)
    let liveFrntBalance : Nat = if (frntrLedgerIsSet()) {
      let tokenActor = actor(frntrLedgerState.frntrLedger) : actor {
        icrc1_balance_of : (TokenTypes.Account) -> async Nat
      };
      await tokenActor.icrc1_balance_of(toFrntrAccount(caller));
    } else {
      player.frntBalance;
    };

    if (liveFrntBalance < cost) { return #err(#InsufficientFRNTR) };

    // Calculate 0.075% liquidity tax: taxAmount = cost * 75 / 100_000
    let taxAmount : Nat = cost * 75 / 100_000;

    // Track the full cost burned (not just the non-tax portion)
    statsState.totalFRNTRBurned += cost;

    // Deduct full cost from player balance
    players.add(caller, { player with frntBalance = player.frntBalance - cost });

    // Record upgrade
    generatorTiers.add(plotId, nextTier);

    // Notify treasury with the tax amount (non-blocking — ignore failures)
    if (treasuryState.treasuryPrincipal != "aaaaa-aa") {
      let treasury : actor { notifyFRNTRFee : (Nat, Principal) -> async { #ok; #err : { #NotAuthorized; #InvalidUsername; #UsernameTaken; #InsufficientFunds; #InvalidDEX; #InvalidPercentages; #NotFound } } } =
        actor(treasuryState.treasuryPrincipal);
      ignore (async { try { ignore (await treasury.notifyFRNTRFee(taxAmount, caller)) } catch (_) {} });
    };

    let view : GameTypes.PlotUpgradesView = {
      plotId;
      generatorTier = nextTier;
      tierName      = GameLib.tierName(nextTier);
      bonusPerDay   = GameLib.tierBonus(nextTier);
      installedAt   = ?Time.now();
      nextTierCost  = switch (GameLib.nextTier(nextTier)) {
        case (null)  { null };
        case (?t)    { ?GameLib.tierCost(t) };
      };
    };
    #ok(view);
  };


  public query func isSubParcelLocked(plotId : Text) : async Bool {
    let fourHoursNs : Int = 14_400_000_000_000;
    switch (plots.get(plotId)) {
      case (null) { false };
      case (?plot) {
        switch (plot.purchaseTimestamp) {
          case (null) { false };
          case (?ts) { Time.now() < ts + fourHoursNs };
        };
      };
    };
  };

  /// Set a new admin principal. Guarded by current admin.
  public shared ({ caller }) func setAdminPrincipal(p : Principal) : async () {
    if (caller.toText() != adminState.adminPrincipal) {
      Runtime.trap("Unauthorized: only admin can call this");
    };
    adminState.adminPrincipal := p.toText();
  };

  public shared ({ caller }) func updateAdminPrincipalAuth(newPrincipal : Text) : async () {
    if (caller.toText() != adminState.adminPrincipal) {
      Runtime.trap("Unauthorized: only admin can call this");
    };
    adminState.adminPrincipal := newPrincipal;
  };

  public query func getAdminPrincipal() : async Text {
    adminState.adminPrincipal;
  };

  /// Returns true if the caller is the current admin principal.
  public shared query ({ caller }) func getIsAdmin() : async Bool {
    not caller.isAnonymous() and caller.toText() == adminState.adminPrincipal;
  };



  /// Returns global leaderboard and economy stats.
  public query func getLeaderboardStats() : async {
    totalPlotsOwned      : Nat;
    totalFRNTRMined      : Nat;
    totalFRNTRBurned     : Nat;
    activePlayers        : Nat;
    leaderboardPrizePool : Nat;
    nextPayoutAt         : Nat;
  } {
    let sold = plotSoldState.count;
    {
      totalPlotsOwned      = sold;
      totalFRNTRMined      = statsState.totalFRNTRMined;
      totalFRNTRBurned     = statsState.totalFRNTRBurned;
      activePlayers        = statsState.activePlayers;
      leaderboardPrizePool = sold * 62_500_000;
      nextPayoutAt         = ((sold / 1500) + 1) * 1500;
    };
  };

  /// Returns the canonical ICP price (e8s) for a plot identified by its H3 index.
  public query func getPlotPrice(h3Index : Text) : async Nat {
    var seed : Nat = 0;
    for (c in h3Index.chars()) {
      seed := (seed * 31 + c.toNat32().toNat()) % 100;
    };
    let pricing = pricingState.pricing;
    if (seed < 60) {
      (pricing.commonMin + pricing.commonMax) / 2;
    } else if (seed < 90) {
      (pricing.rareMin + pricing.rareMax) / 2;
    } else {
      (pricing.epicMin + pricing.epicMax) / 2;
    };
  };

  // ---------------------------------------------------------------------------
  // MINING DISABLED — gated behind featureFlag; will be re-enabled in a future
  // update when the full resource-mining system launches.
  // ---------------------------------------------------------------------------
  /// Mine resources from an owned plot.
  /// DISABLED: returns an informative error until the mining system launches.
  public shared ({ caller }) func mineResources(_plotId : Text) : async { #ok : GameTypes.MineResult; #err : Text } {
    ignore caller;
    #err("Resource mining is coming soon. Stay tuned for the next update!");
  };

  /// Testnet faucet: grants exactly 500 FRNTR per click.
  /// No cooldown, no rate limit. ICP is real and not simulated.
  public shared ({ caller }) func testFaucet() : async { #ok : Text; #err : Text } {
    if (not TESTNET_MODE) { return #err("Faucet only available in testnet mode") };
    if (caller.isAnonymous()) { return #err("Must be authenticated") };
    let player = switch (players.get(caller)) {
      case (null) {
        statsState.activePlayers += 1;
        let np = emptyPlayerState();
        players.add(caller, np);
        np;
      };
      case (?p) { p };
    };
    let updatedPlayer = { player with frntBalance = player.frntBalance + 500 };
    players.add(caller, updatedPlayer);
    statsState.totalFRNTRMined += 500;
    #ok("Testnet faucet: 500 FRNTR credited.");
  };

  /// Set a unique username (3-16 alphanumeric + underscore).
  public shared ({ caller }) func setUsername(username : Text) : async { #ok; #err : Text } {
    if (caller.isAnonymous()) { return #err("Must be authenticated") };
    let len = username.size();
    if (len < 3 or len > 16) { return #err("Username must be 3-16 characters") };
    for (c in username.chars()) {
      let ok = (c >= 'a' and c <= 'z') or (c >= 'A' and c <= 'Z') or
               (c >= '0' and c <= '9') or c == '_';
      if (not ok) { return #err("Username: only letters, digits, underscores allowed") };
    };
    for ((p, uname) in usernames.entries()) {
      if (uname == username and p != caller) { return #err("Username already taken") };
    };
    usernames.add(caller, username);
    #ok;
  };

  /// Public leaderboard query: top players by FRNTR balance.
  public query func getLeaderboard(limit : Nat) : async [{ rank : Nat; principal : Text; username : ?Text; frntBalance : Nat; plotsOwned : Nat }] {
    let pairs = players.toArray();
    let sorted = pairs.sort(func(a, b) { Nat.compare(b.1.frntBalance, a.1.frntBalance) });
    let taken = Nat.min(limit, sorted.size());
    let sliced = sorted.sliceToArray(0, taken);
    var i = 0;
    sliced.map<(Principal, PlayerState), { rank : Nat; principal : Text; username : ?Text; frntBalance : Nat; plotsOwned : Nat }>(
      func((p, ps)) {
        i += 1;
        { rank = i; principal = p.toText(); username = usernames.get(p);
          frntBalance = ps.frntBalance; plotsOwned = ps.plotsOwned };
      }
    );
  };

  /// Update the treasury canister principal (admin only).
  public shared ({ caller }) func setTreasuryPrincipal(p : Principal) : async () {
    if (caller.toText() != adminState.adminPrincipal) {
      Runtime.trap("Unauthorized: only admin can call this");
    };
    treasuryState.treasuryPrincipal := p.toText();
  };

  /// Query the current treasury canister principal.
  public query func getTreasuryPrincipal() : async Text {
    treasuryState.treasuryPrincipal;
  };

  public shared ({ caller }) func getPlayerState() : async {
    ownedPlots         : [Text];
    plotIds            : [Text];
    frntBalance        : Nat;
    icpBalance         : Nat;
    resourceBalances   : [(GameTypes.ResourceType, Float)];
    generatorTiersMap  : [(Text, Nat)];
    username           : ?Text;
    lastFaucetTime     : ?Int;
    iron               : Nat;
    fuel               : Nat;
    crystal            : Nat;
    plotsOwned         : Nat;
    combatVictories    : Nat;
    totalFRNTRBurned   : Float;
    passiveIncomePerDay : Float;
  } {
    if (caller.isAnonymous()) {
      return {
        ownedPlots = []; plotIds = []; frntBalance = 0; icpBalance = 0; resourceBalances = [];
        generatorTiersMap = []; username = null; lastFaucetTime = null;
        iron = 0; fuel = 0; crystal = 0; plotsOwned = 0;
        combatVictories = 0; totalFRNTRBurned = 0.0; passiveIncomePerDay = 0.0;
      };
    };
    let base = switch (players.get(caller)) {
      case (null) { emptyPlayerState() };
      case (?p)   { p };
    };

    var ownedList : [Text] = [];
    var genList : [(Text, Nat)] = [];
    for ((plotId, plot) in plots.entries()) {
      if (plot.owner == ?caller) {
        ownedList := ownedList.concat([plotId]);
        let tierNat : Nat = switch (generatorTiers.get(plotId)) {
          case (null)      { 0 };
          case (?#None)    { 0 };
          case (?#TierI)   { 1 };
          case (?#TierII)  { 2 };
          case (?#TierIII) { 3 };
          case (?#TierIV)  { 4 };
          case (?#TierV)   { 5 };
          case (?#TierVI)  { 6 };
        };
        genList := genList.concat([(plotId, tierNat)]);
      };
    };

    let resourceBalances : [(GameTypes.ResourceType, Float)] = [
      (#Iron,      base.iron.toFloat()),
      (#Fuel,      base.fuel.toFloat()),
      (#Crystal,   base.crystal.toFloat()),
      (#RareEarth, 0.0),
    ];

    // If FRNTR ledger is set, fetch live balance from ICRC-1 canister
    let frntBalance : Nat = if (frntrLedgerIsSet()) {
      let tokenActor = actor(frntrLedgerState.frntrLedger) : actor {
        icrc1_balance_of : (TokenTypes.Account) -> async Nat
      };
      await tokenActor.icrc1_balance_of(toFrntrAccount(caller));
    } else {
      base.frntBalance;
    };

    let icpLedger = actor(ICP_LEDGER_ID) : actor {
      icrc1_balance_of : ({ owner : Principal; subaccount : ?Blob }) -> async Nat
    };
    let icpBalance : Nat = await icpLedger.icrc1_balance_of({ owner = caller; subaccount = null });

    {
      ownedPlots          = ownedList;
      plotIds             = ownedList;
      frntBalance;
      icpBalance;
      resourceBalances;
      generatorTiersMap   = genList;
      username            = usernames.get(caller);
      lastFaucetTime      = null;
      iron                = base.iron;
      fuel                = base.fuel;
      crystal             = base.crystal;
      plotsOwned          = base.plotsOwned;
      combatVictories     = base.combatVictories;
      totalFRNTRBurned    = base.totalFRNTRBurned;
      passiveIncomePerDay = computePassiveIncomePerDay(caller);
    };
  };

    /// Query the full player state for a given principal.
  /// Returns a zeroed state if the principal has not played yet.
  /// Uses live ICRC-1 ledger balance when frntrLedger is configured.
  public shared func getPlayerStateByPrincipal(principal : Principal) : async {
    ownedPlots         : [Text];
    plotIds            : [Text];
    frntBalance        : Nat;
    icpBalance         : Nat;
    resourceBalances   : [(GameTypes.ResourceType, Float)];
    generatorTiersMap  : [(Text, Nat)];
    username           : ?Text;
    lastFaucetTime     : ?Int;
    iron               : Nat;
    fuel               : Nat;
    crystal            : Nat;
    plotsOwned         : Nat;
    combatVictories    : Nat;
    totalFRNTRBurned   : Float;
    passiveIncomePerDay : Float;
  } {
    let base = switch (players.get(principal)) {
      case (null) { emptyPlayerState() };
      case (?p)   { p };
    };

    var ownedList : [Text] = [];
    var genList : [(Text, Nat)] = [];
    for ((plotId, plot) in plots.entries()) {
      if (plot.owner == ?principal) {
        let idText = plotId;
        ownedList := ownedList.concat([idText]);
        let tierNat : Nat = switch (generatorTiers.get(plotId)) {
          case (null)      { 0 };
          case (?#None)    { 0 };
          case (?#TierI)   { 1 };
          case (?#TierII)  { 2 };
          case (?#TierIII) { 3 };
          case (?#TierIV)  { 4 };
          case (?#TierV)   { 5 };
          case (?#TierVI)  { 6 };
        };
        genList := genList.concat([(idText, tierNat)]);
      };
    };

    let resourceBalances : [(GameTypes.ResourceType, Float)] = [
      (#Iron,      base.iron.toFloat()),
      (#Fuel,      base.fuel.toFloat()),
      (#Crystal,   base.crystal.toFloat()),
      (#RareEarth, 0.0),
    ];

    // If FRNTR ledger is set, fetch live balance from ICRC-1 canister
    let frntBalance : Nat = if (frntrLedgerIsSet()) {
      let tokenActor = actor(frntrLedgerState.frntrLedger) : actor {
        icrc1_balance_of : (TokenTypes.Account) -> async Nat
      };
      await tokenActor.icrc1_balance_of(toFrntrAccount(principal));
    } else {
      base.frntBalance;
    };

    let icpLedger2 = actor(ICP_LEDGER_ID) : actor {
      icrc1_balance_of : ({ owner : Principal; subaccount : ?Blob }) -> async Nat
    };
    let icpBalance : Nat = await icpLedger2.icrc1_balance_of({ owner = principal; subaccount = null });

    {
      ownedPlots          = ownedList;
      plotIds             = ownedList;
      frntBalance;
      icpBalance;
      resourceBalances;
      generatorTiersMap   = genList;
      username            = usernames.get(principal);
      lastFaucetTime      = null;
      iron                = base.iron;
      fuel                = base.fuel;
      crystal             = base.crystal;
      plotsOwned          = base.plotsOwned;
      combatVictories     = base.combatVictories;
      totalFRNTRBurned    = base.totalFRNTRBurned;
      passiveIncomePerDay = computePassiveIncomePerDay(principal);
    };
  };

func missileStats(missileType : Text) : MissileStats {
    switch (missileType) {
      case ("ICBM-P") { return { cost = 200; atkPower = 100 } };
      case ("TOMAHAWK-C") { return { cost = 80; atkPower = 60 } };
      case ("HELLFIRE-G") { return { cost = 40; atkPower = 45 } };
      case ("JAVELIN-A") { return { cost = 30; atkPower = 35 } };
      case ("SENTINEL-H") { return { cost = 60; atkPower = 55 } };
      case ("VIPER-120") { return { cost = 20; atkPower = 25 } };
      case ("HIMARS-R") { return { cost = 90; atkPower = 30 } };
      case ("PALADIN-H") { return { cost = 70; atkPower = 45 } };
      case ("MLRS-X") { return { cost = 110; atkPower = 50 } };
      case ("EXCALIBUR-P") { return { cost = 120; atkPower = 70 } };
      case (_) { Runtime.trap("Invalid missile type") };
    };
  };

  func getInterceptorChance(interceptorType : Text) : Float {
    switch (interceptorType) {
      case ("IRON-DOME-F") { return 0.7 };
      case ("THAAD-X") { return 0.85 };
      case ("AEGIS-S") { return 0.9 };
      case (_) { return 0.0 };
    };
  };

  func emptyPlayerState() : PlayerState {
    {
      iron = 0;
      fuel = 0;
      crystal = 0;
      frntBalance = 0;
      icpBalance = 0;
      plotsOwned = 0;
      combatVictories = 0;
      commanderType = null;
      commanderAtk = 0;
      commanderDef = 0;
      satelliteExpiry = 0;
      reconTargets = [];
      empTargets = [];
      totalFRNTRBurned = 0.0;
      passiveIncomePerDay = 0.0;
      lastClaimTime = 0;
    };
  };

  func clamp(value : Float, min : Float, max : Float) : Float {
    if (value < min) { return min };
    if (value > max) { return max };
    value;
  };

  func latDistance(x1 : Float, x2 : Float) : Float {
    let diff : Float = x1 - x2;
    let normalizedDiff : Float = clamp(diff, -90.0, 90.0);
    normalizedDiff;
  };

  public shared ({ caller }) func purchasePlot(plotId : Text) : async { #ok : Text; #err : Text } {
    if (caller.isAnonymous()) { return #err("Anonymous users cannot purchase plots") };
    let plot = switch (plots.get(plotId)) {
      case (null) {
        // Auto-create the plot so any valid H3 index is purchasable
        var seed : Nat = 0;
        for (c in plotId.chars()) {
          seed := (seed * 31 + c.toNat32().toNat()) % 100;
        };
        let richness : Nat = 78 + seed % 21;
        let newPlot : PlotState = {
          plotId;
          biome = "ocean";
          richness;
          lat = 0.0;
          lng = 0.0;
          owner = null;
          nftTokenId = null;
          iron = 0;
          fuel = 0;
          crystal = 0;
          lastTick = Time.now();
          defenses = { turrets = 0; shields = 0; walls = 0 };
          facilities = { electricityPlant = false; blockchainNode = false; dataCentre = false; aiLab = false };
          attackCooldown = 0;
          faction = null;
          morale = 100;
          interceptorSystem = null;
          purchaseTimestamp = null;
          nexusElectricityLevel = 0;
        };
        plots.add(plotId, newPlot);
        newPlot;
      };
      case (?p)   { p };
    };

    switch (plot.owner) {
      case (?owner) {
        if (owner == caller) { return #err("You already own this plot") };
        return #err("Plot already owned");
      };
      case (null) {};
    };

    switch (plot.faction) {
      case (?faction) {
        if (faction == "NEXUS-7" or faction == "KRONOS" or faction == "VANGUARD" or faction == "SPECTRE") {
          return #err("Plot is claimed by a faction");
        };
      };
      case (null) {};
    };

    // Ensure player record exists
    let player = switch (players.get(caller)) {
      case (null) {
        statsState.activePlayers += 1;
        let newPlayer : PlayerState = emptyPlayerState();
        players.add(caller, newPlayer);
        newPlayer;
      };
      case (?p) { p };
    };

    // Dynamic pricing from richness
    let icpAmt : Nat = do {
      let richness : Nat = plot.richness;
      let pricing = pricingState.pricing;
      if (richness < 90) {
        pricing.commonMin + ((pricing.commonMax - pricing.commonMin) * (richness - 78) / 11);
      } else if (richness < 97) {
        pricing.rareMin + ((pricing.rareMax - pricing.rareMin) * (richness - 90) / 6);
      } else {
        pricing.epicMin + ((pricing.epicMax - pricing.epicMin) * (richness - 97) / 2);
      };
    };

    // In TESTNET_MODE skip real ICP ledger transfer, simulate success
    if (not TESTNET_MODE) {
      let icpLedger = actor(ICP_LEDGER_ID) : actor {
        icrc2_transfer_from : (ICRC2TransferFromArgs) -> async ICRC2TransferFromResult
      };
      let transferArgs : ICRC2TransferFromArgs = {
        from             = { owner = caller; subaccount = null };
        to               = { owner = Principal.fromText(selfPrincipalText); subaccount = null };
        amount           = icpAmt;
        fee              = ?10_000;
        memo             = null;
        created_at_time  = null;
        spender_subaccount = null;
      };
      switch (await icpLedger.icrc2_transfer_from(transferArgs)) {
        case (#Err(err)) {
          // Treasury deposit failed — do NOT assign ownership
          return #err("ICP transfer failed: " # debug_show(err));
        };
        case (#Ok(_)) {};
      };
    };

    // ICP transfer succeeded (or skipped in TESTNET_MODE) — assign ownership atomically
    let updatedPlayer2 : PlayerState = {
      player with
      plotsOwned = player.plotsOwned + 1;
    };
    players.add(caller, updatedPlayer2);
    plotSoldState.count += 1;

    // Apply 25/25/50 treasury split on ICP payment (precise Nat arithmetic)
    treasuryPots.devPot         += icpAmt / 4;                               // 25%
    treasuryPots.leaderboardPot += icpAmt / 4;                               // 25%
    treasuryPots.liquidityPot   += icpAmt - (icpAmt / 4) - (icpAmt / 4);   // 50% remainder

    let updatedPlot2 : PlotState = {
      plot with
      owner = ?caller;
      purchaseTimestamp = ?Time.now();
    };
    plots.add(plotId, updatedPlot2);

    // Notify treasury canister if configured (non-blocking — ignore failures)
    if (treasuryState.treasuryPrincipal != "aaaaa-aa") {
      let treasury : actor { notifyPlotPurchase : (Nat, Principal) -> async () } =
        actor(treasuryState.treasuryPrincipal);
      ignore (async { try { await treasury.notifyPlotPurchase(icpAmt, caller) } catch (_) {} });
    };

    #ok("Purchase successful, congrats!");
  };

  /// Seed plots from the frontend (admin only). Skips plots that already exist.
  /// Also creates 7 sub-parcels per plot (slot 0 = center Nexus, slots 1-6 = surrounding).
  public shared ({ caller }) func initPlots(plotData : [(Text, Text, Float, Float, Nat)]) : async () {
    if (caller.toText() != adminState.adminPrincipal) {
      Runtime.trap("Unauthorized: only admin can call initPlots");
    };
    for ((id, biome, lat, lng, richness) in plotData.vals()) {
      if (plots.get(id) == null) {
        let now = Time.now();
        plots.add(id, {
          plotId    = id;
          biome;
          richness;
          lat;
          lng;
          owner              = null;
          nftTokenId         = null;
          iron               = 0;
          fuel               = 0;
          crystal            = 0;
          lastTick           = now;
          defenses           = { turrets = 0; shields = 0; walls = 0 };
          facilities         = { electricityPlant = false; blockchainNode = false;
                                 dataCentre = false; aiLab = false };
          attackCooldown     = 0;
          faction            = null;
          morale             = 100;
          interceptorSystem  = null;
          purchaseTimestamp  = null;
          nexusElectricityLevel = 0;
        });
        // Create 7 sub-parcels: slot 0 = center Nexus, slots 1-6 = surrounding
        var slot = 0;
        while (slot < 7) {
          let subId = id # ":" # slot.toText();
          subParcels.add(subId, {
            subParcelId    = subId;
            plotId         = id;
            slotIndex      = slot;
            specialization = "none";
            building       = null;
            cooldownEnds   = 0;
          });
          slot += 1;
        };
      };
    };
  };

  /// Returns the ICP price in e8s for a plot identified by its H3 Text ID.
  /// Price tier is derived from biome richness stored in the plots map.
  public query func getPlotPriceById(plotId : Text) : async Nat {
    let richness : Nat = switch (plots.get(plotId)) {
      case (null)  {
        // Fall back to deterministic richness from H3 index if plot not seeded yet
        var seed : Nat = 0;
        for (c in plotId.chars()) {
          seed := (seed * 31 + c.toNat32().toNat()) % 100;
        };
        78 + seed % 21;
      };
      case (?plot) { plot.richness };
    };
    let pricing = pricingState.pricing;
    // richness 78-89 = common (2-3 ICP), 90-96 = rare (6-12 ICP), 97-98 = epic (20-40 ICP)
    if (richness < 90) {
      (pricing.commonMin + pricing.commonMax) / 2;
    } else if (richness < 97) {
      (pricing.rareMin + pricing.rareMax) / 2;
    } else {
      (pricing.epicMin + pricing.epicMax) / 2;
    };
  };

  /// Returns all 7 sub-parcels for a given plot ID.
  public query func getSubParcels(plotId : Text) : async [SubParcel] {
    var result : [SubParcel] = [];
    var slot = 0;
    while (slot < 7) {
      let subId = plotId # ":" # slot.toText();
      switch (subParcels.get(subId)) {
        case (?sp) { result := result.concat([sp]) };
        case (null) {};
      };
      slot += 1;
    };
    result;
  };

  /// Returns 7 SubParcelInfo entries (slots 0-6) for a plot.
  /// isLocked = true during the 4-hour post-purchase cooldown.
  /// cooldownSecondsRemaining = 0 when not locked.
  /// Sub-parcel ID = plotId # ":" # slotIndex.
  public query func getSubParcelStatus(plotId : Text) : async [GameTypes.SubParcelInfo] {
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
              // Convert nanoseconds to seconds
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
      let subId = plotId # ":" # slot.toText();
      let (buildingType, resourceRate) : (Text, Float) = switch (subParcels.get(subId)) {
        case (null) { ("", 0.0) };
        case (?sp) {
          let bType = switch (sp.building) {
            case (null) { if (slot == 0) { "Nexus" } else { "" } };
            case (?b)   { b };
          };
          let rate : Float = if (slot == 0) {
            // Nexus slot produces from nexusElectricityLevel
            switch (plots.get(plotId)) {
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
          } else {
            0.0;
          };
          (bType, rate);
        };
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

  /// Returns the total number of plots currently stored.
  public query func getPlotCount() : async Nat { plots.size() };

  /// Returns all plots that have an owner as (plotId, ownerPrincipalText) pairs.
  public query func getAllPlotOwners() : async [(Text, Text)] {
    var result : [(Text, Text)] = [];
    for ((id, plot) in plots.entries()) {
      switch (plot.owner) {
        case (?_owner) { result := result.concat([(id, _owner.toText())]) };
        case (null) {};
      };
    };
    result;
  };

  /// Returns all owned plots as (plotId, ownerPrincipalText) pairs.
  /// Alias used by frontend for globe ownership sync.
  public query func getLivePlotOwners() : async [(Text, Text)] {
    var result : [(Text, Text)] = [];
    for ((id, plot) in plots.entries()) {
      switch (plot.owner) {
        case (?_owner) { result := result.concat([(id, _owner.toText())]) };
        case (null) {};
      };
    };
    result;
  };

  /// Returns the first plot ID with no owner, or null if all plots are owned.
  /// Used by the stress-test to find a purchasable plot without hardcoding an ID.
  public query func getFirstAvailablePlot() : async ?Text {
    var found : ?Text = null;
    label search for ((id, plot) in plots.entries()) {
      switch (plot.owner) {
        case (null) { found := ?id; break search };
        case (?_)   {};
      };
    };
    found;
  };

  /// Returns all plot IDs owned by a given principal.
  public query func getPlotsByOwner(owner : Principal) : async [Text] {
    var result : [Text] = [];
    for ((id, plot) in plots.entries()) {
      switch (plot.owner) {
        case (?o) { if (o == owner) { result := result.concat([id]) } };
        case (null) {};
      };
    };
    result;
  };

  /// Returns the canonical generator tier catalog for all tiers.
  /// Frontend uses this so tier data is never hardcoded.
  public query func getGeneratorTierCatalog() : async [{ tierIndex : Nat; bonusPerDay : Float; cost : Nat }] {
    [
      { tierIndex = 0; bonusPerDay = 0.0;  cost = 0 },
      { tierIndex = 1; bonusPerDay = 2.0;  cost = GameLib.tierCost(#TierI) },
      { tierIndex = 2; bonusPerDay = 5.0;  cost = GameLib.tierCost(#TierII) },
      { tierIndex = 3; bonusPerDay = 10.0; cost = GameLib.tierCost(#TierIII) },
      { tierIndex = 4; bonusPerDay = 18.0; cost = GameLib.tierCost(#TierIV) },
      { tierIndex = 5; bonusPerDay = 30.0; cost = GameLib.tierCost(#TierV) },
      { tierIndex = 6; bonusPerDay = 48.0; cost = GameLib.tierCost(#TierVI) },
    ];
  };

  /// Live global game stats for the UNIVERSE panel (v2 — detailed fields).
  /// totalSupply = 10B hard cap (in e8s); remainingMineable = 5B mineable cap minus total burned.
  public query func getGameStats() : async {
    totalSupply        : Nat;
    totalBurned        : Nat;
    totalPlots         : Nat;
    totalPlayers       : Nat;
    emissionRatePerDay : Nat;
    remainingMineable  : Nat;
    totalFrntrBurned   : Nat;
  } {
    // mineableCap in e8s: 5_000_000_000 FRNTR * 100_000_000 e8s
    let mineableCap : Nat = 5_000_000_000_00000000;
    let burned      : Nat = statsState.totalFRNTRBurned;
    let remaining   : Nat = if (burned >= mineableCap) { 0 } else { mineableCap - burned };
    let ownedCount  : Nat = plots.size();
    {
      totalSupply        = 10_000_000_000_00000000; // 10B FRNTR in e8s
      totalBurned        = burned;
      totalPlots         = plotSoldState.count;     // plots sold (purchased)
      totalPlayers       = players.size();       // live player count
      emissionRatePerDay = plotSoldState.count * 7;
      remainingMineable  = remaining;
      totalFrntrBurned   = burned;
    };
  };

  /// Returns current balances of the three treasury pots in e8s.
  /// devPot: 25% of plot ICP; leaderboardPot: 25%; liquidityPot: 50%.
  /// getTreasuryState: alias for getTreasuryBalances, returns the 25/25/50 split balances.
  /// Shape: { developer: Nat; leaderboard: Nat; liquidity: Nat } (all in e8s).
  public query func getTreasuryState() : async {
    developer   : Nat;
    leaderboard : Nat;
    liquidity   : Nat;
  } {
    {
      developer   = treasuryPots.devPot;
      leaderboard = treasuryPots.leaderboardPot;
      liquidity   = treasuryPots.liquidityPot;
    };
  };

  public func getTreasuryBalances() : async {
    devPot        : Nat;
    leaderboardPot : Nat;
    liquidityPot  : Nat;
  } {
    let icpLedgerBal = actor(ICP_LEDGER_ID) : actor {
      icrc1_balance_of : ({ owner : Principal; subaccount : ?Blob }) -> async Nat;
    };
    let self = Principal.fromText(selfPrincipalText);
    let mkSub = func(index : Nat8) : Blob {
      let bytes : [Nat8] = Array.tabulate<Nat8>(32, func(i) { if (i == 31) index else 0 });
      Blob.fromArray(bytes);
    };
    let devBal = await icpLedgerBal.icrc1_balance_of({ owner = self; subaccount = ?mkSub(1) });
    let ldrBal = await icpLedgerBal.icrc1_balance_of({ owner = self; subaccount = ?mkSub(2) });
    let liqBal = await icpLedgerBal.icrc1_balance_of({ owner = self; subaccount = ?mkSub(3) });
    {
      devPot         = devBal;
      leaderboardPot = ldrBal;
      liquidityPot   = liqBal;
    };
  };

  stable var approvedDexPrincipalText : ?Text = null;

  public shared ({ caller }) func setApprovedLiquidityCanister(
    dexCanister : Principal,
  ) : async { #ok; #err : Text } {
    if (caller.toText() != adminState.adminPrincipal) {
      return #err("NotAuthorized: admin only");
    };
    approvedDexPrincipalText := ?dexCanister.toText();
    #ok;
  };

  public shared ({ caller }) func withdrawLiquidityPot(
    amountE8s : Nat,
    recipient : Principal,
  ) : async { #ok; #err : Text } {
    if (caller.toText() != adminState.adminPrincipal) {
      return #err("NotAuthorized: admin only");
    };
    switch (approvedDexPrincipalText) {
      case null { return #err("Unauthorized: no approved DEX canister set") };
      case (?approved) {
        if (recipient.toText() != approved) {
          return #err("Unauthorized: recipient not whitelisted");
        };
      };
    };
    if (amountE8s > treasuryPots.liquidityPot) {
      return #err("InsufficientFunds");
    };
    // Transfer from liquidity subaccount to recipient via ICP ledger
    let icpLedgerTransfer = actor(ICP_LEDGER_ID) : actor {
      icrc1_transfer : ({
        to : { owner : Principal; subaccount : ?Blob };
        amount : Nat;
        fee : ?Nat;
        memo : ?Blob;
        from_subaccount : ?Blob;
        created_at_time : ?Nat64;
      }) -> async { #Ok : Nat; #Err : Text };
    };
    let mkSub = func(index : Nat8) : Blob {
      let bytes : [Nat8] = Array.tabulate<Nat8>(32, func(i) { if (i == 31) index else 0 });
      Blob.fromArray(bytes);
    };
    let result = await icpLedgerTransfer.icrc1_transfer({
      to              = { owner = recipient; subaccount = null };
      amount          = amountE8s;
      fee             = ?10_000;
      memo            = null;
      from_subaccount = ?mkSub(3);
      created_at_time = null;
    });
    switch (result) {
      case (#Ok(_)) {
        treasuryPots.liquidityPot -= amountE8s;
        #ok;
      };
      case (#Err(e)) { #err(e) };
    };
  };

  public shared ({ caller }) func launchMissile(
    fromPlotId : Text,
    toPlotId : Text,
    missileType : Text,
  ) : async { #ok : Text; #err : Text } {
    if (caller.isAnonymous()) { return #err("Anonymous users cannot launch missile attacks") };
    let fromPlot = validatePlotExists(fromPlotId);
    let missile = missileStats(missileType);

    switch (fromPlot.owner) {
      case (null) { return #err("Attacker plot not owned") };
      case (?owner) {
        if (owner != caller) { return #err("Attacker plot not owned by you") };
      };
    };

    let toPlot = validatePlotExists(toPlotId);

    // Check for interceptor system
    var intercepted = false;
    var interceptorType : Text = "";
    let playerForBalance = switch (players.get(caller)) {
      case (null) { emptyPlayerState() };
      case (?player) { player };
    };

    let interceptorChance = switch (interceptors.get(toPlotId)) {
      case (null) { 0.0 };
      case (?interceptor) {
        intercepted := true;
        let goalieInterceptChance = getInterceptorChance(interceptor);
        interceptorType := interceptor;
        goalieInterceptChance;
      };
    };

    // Deduct FRNTR regardless of intercept stats
    if (missile.cost > playerForBalance.frntBalance) {
      return #err("Not enough FRNTR to launch missile");
    };
    let updatedPlayerForBalance = {
      playerForBalance with
      frntBalance = playerForBalance.frntBalance - missile.cost;
      totalFRNTRBurned = playerForBalance.totalFRNTRBurned + missile.cost.toFloat();
    };
    players.add(caller, updatedPlayerForBalance);

    if (interceptorChance > 0.0 and intercepted) {
      let timestamp : Int = Time.now();
      recordCombatEvent(
        timestamp,
        caller,
        fromPlotId,
        toPlotId,
        false,
        missile.atkPower,
        0,
        true,
        ?interceptorType,
        ?missileType,
      );

      return #ok("Missile intercepted by " # interceptorType # " system! FRNTR was still consumed :(");
    } else {
      resolveMissileWithoutInterceptor(caller, fromPlotId, toPlotId, missileType, fromPlot, toPlot, missile);
    };
  };

  func recordCombatEvent(
    timestamp : Int,
    attacker : Principal,
    fromPlot : Text,
    toPlot : Text,
    success : Bool,
    atkPower : Nat,
    defPower : Nat,
    intercepted : Bool,
    interceptorType : ?Text,
    missileType : ?Text,
  ) {
    let combatEvent2 : CombatEvent = {
      timestamp;
      attacker;
      fromPlot;
      toPlot;
      success;
      atkPower;
      defPower;
      intercepted;
      interceptorType;
      missileType;
    };
    combatLog.add(timestamp, combatEvent2);
  };

  func resolveMissileWithoutInterceptor(
    caller : Principal,
    fromPlot : Text,
    toPlot : Text,
    missileType : Text,
    _attackerPlot : PlotState,
    defenderPlot : PlotState,
    missile : MissileStats,
  ) : { #ok : Text; #err : Text } {
    let toPlotDefenses = switch (defenderPlot.owner) {
      case (null) { defenderPlot.defenses };
      case (?_owner) { defenderPlot.defenses };
    };
    let defPower = toPlotDefenses.turrets * 3 + toPlotDefenses.shields * 5 + toPlotDefenses.walls * 2 + 5;
    let success = missile.atkPower > defPower;
    let timestamp : Int = Time.now();

    if (success) {
      let currentPlayerState = switch (players.get(caller)) {
        case (null) { emptyPlayerState() };
        case (?playerState) { playerState };
      };
      let strongPlayerState = {
        currentPlayerState with
        combatVictories = currentPlayerState.combatVictories + 1;
      };
      players.add(caller, strongPlayerState);

      let overpoweredPlot : PlotState = {
        defenderPlot with
        owner = ?caller;
        defenses = {
          turrets = 0;
          shields = 0;
          walls = 0;
        };
      };
      plots.add(toPlot, overpoweredPlot);
      recordCombatEvent(
        timestamp,
        caller,
        fromPlot,
        toPlot,
        success,
        missile.atkPower,
        defPower,
        false,
        null,
        ?missileType,
      );
      #ok("Missile attack successful, plot captured! Atk Power: " # missile.atkPower.toText() # ", Def Power: " # defPower.toText());
    } else {
      recordCombatEvent(
        timestamp,
        caller,
        fromPlot,
        toPlot,
        success,
        missile.atkPower,
        defPower,
        false,
        null,
        ?missileType,
      );
      #ok("Missile attack failed, defenses held! Atk Power: " # missile.atkPower.toText() # ", Def Power: " # defPower.toText());
    };
  };

  public query ({ caller }) func getCombatLog(limit : Nat) : async [CombatEvent] {
    let sortedEvents = combatLog.toArray().sort(func(a, b) { Int.compare(b.0, a.0) });
    let limitedEvents = sortedEvents.sliceToArray(0, Nat.min(limit, sortedEvents.size()));
    limitedEvents.map(func((timestamp, event)) { event });
  };

  public query ({ caller }) func getAdjacentPlots(plotId : Text) : async [Text] {
    let plot : PlotState = switch (plots.get(plotId)) {
      case (null) { return [] };
      case (?p) { p };
    };
    let resultArray : [Text] = plots.keys().toArray().filter(
      func(id : Text) : Bool {
        if (id == plotId) { return false };
        switch (plots.get(id)) {
          case (null) { false };
          case (?nextPlot) {
            Float.abs(latDistance(plot.lat, nextPlot.lat) * 1.5) <= 15.0;
          };
        };
      }
    );
    resultArray.sliceToArray(0, Float.min(6.0, resultArray.size().toFloat()).toInt());
  };

  // ===========================================================================
  // SURVEY SYSTEM — pay-to-unlock, 30-minute timer, biome + resource % result
  // ===========================================================================

  /// Survey cost in FRNTR e8s by plot rarity.
  /// Common: 100 FRNTR, Rare: 250 FRNTR, Epic: 500 FRNTR.
  private func surveyCostForPlot(plotId : Text) : Nat {
    let rarity = switch (_plotRarities.get(plotId)) {
      case (?r) { r };
      case (null) {
        switch (plots.get(plotId)) {
          case (?plot) { GameLib.rarityFromBiome(plot.biome, 0) };
          case (null)  { #Common };
        };
      };
    };
    switch (rarity) {
      case (#Common) { 10_000_000_000 };   // 100 FRNTR at 8 decimals
      case (#Rare)   { 25_000_000_000 };   // 250 FRNTR at 8 decimals
      case (#Epic)   { 50_000_000_000 };   // 500 FRNTR at 8 decimals
    };
  };

  /// Key for the survey map: plotId # "::" # Principal.toText(principal)
  private func surveyKey(plotId : Text, p : Principal) : Text {
    plotId # "::" # p.toText();
  };

  /// Compute a completed survey result from the plot's stored biome and richness.
  private func buildSurveyResult(plotId : Text) : GameTypes.SurveyResult {
    let (biomeVariant, resPct) = switch (plots.get(plotId)) {
      case (null) {
        (#Temperate : GameTypes.Biome, 50);
      };
      case (?plot) {
        let bv : GameTypes.Biome = switch (plot.biome) {
          case ("Temperate")      { #Temperate };
          case ("Desert")         { #Desert };
          case ("Arctic")         { #Arctic };
          case ("Tropical")       { #Tropical };
          case ("Ocean")          { #Ocean };
          case ("DeepOcean")      { #DeepOcean };
          case ("Volcanic")       { #Volcanic };
          case ("AsteroidImpact") { #AsteroidImpact };
          case (_) { GameLib.assignBiome(plot.lat, plot.lng, plotId) };
        };
        (bv, GameLib.resourcePercentageForBiome(bv, plotId));
      };
    };
    let bonus : ?Text = switch (biomeVariant) {
      case (#AsteroidImpact) { ?("Exotic asteroid particles detected — rare mineral deposits present.") };
      case (#Volcanic)       { ?("High geothermal activity — potential for rare mineral seams.") };
      case (#DeepOcean)      { ?("Deep-sea currents detected — strategic shipping lane access.") };
      case (#Ocean)          { ?("Coastal waters — moderate shipping lane proximity.") };
      case (_)               { null };
    };
    { biome = biomeVariant; resourcePercentage = resPct; bonusInfo = bonus };
  };

  /// Start a survey for a plot the caller owns.
  /// Deducts the survey cost in FRNTR (from local balance or ICRC-1 ledger) and
  /// records an in-progress survey record with startTime = now.
  /// Returns #err if the plot is not owned by the caller, if a survey is already
  /// in progress or completed, or if the caller has insufficient FRNTR.
  public shared ({ caller }) func startSurvey(plotId : Text) : async { #ok : GameTypes.SurveyView; #err : Text } {
    if (caller.isAnonymous()) { return #err("Must be authenticated to start a survey") };

    let plot = switch (plots.get(plotId)) {
      case (null) { return #err("Plot not found") };
      case (?p)   { p };
    };
    if (plot.owner != ?caller) { return #err("You do not own this plot") };

    let key = surveyKey(plotId, caller);
    switch (surveys.get(key)) {
      case (?existing) {
        switch (existing.status) {
          case (#InProgress) { return #err("Survey already in progress for this plot") };
          case (#Completed)  { return #err("Survey already completed. Call getSurveyResult to view it.") };
          case (#Locked) {}; // allow re-start on a locked (never-started) entry
        };
      };
      case (null) {};
    };

    let cost = surveyCostForPlot(plotId);
    let now  = Time.now();

    // Deduct survey cost from FRNTR balance
    let player = switch (players.get(caller)) {
      case (null) { return #err("No player record found. Purchase a plot first.") };
      case (?p)   { p };
    };

    let liveFrntBalance : Nat = if (frntrLedgerIsSet()) {
      let tokenActor = actor(frntrLedgerState.frntrLedger) : actor {
        icrc1_balance_of : (TokenTypes.Account) -> async Nat
      };
      await tokenActor.icrc1_balance_of(toFrntrAccount(caller));
    } else {
      player.frntBalance;
    };

    if (liveFrntBalance < cost) {
      return #err(
        "Insufficient FRNTR. Need " # Nat.toText(cost / 100_000_000) # " FRNTR to survey this plot."
      );
    };

    // Burn the survey cost via ICRC-1 transfer when ledger is configured
    if (frntrLedgerIsSet()) {
      type TransferArgs = {
        to              : { owner : Principal; subaccount : ?Blob };
        amount          : Nat;
        fee             : ?Nat;
        memo            : ?Blob;
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
      let frntrActor = actor(frntrLedgerState.frntrLedger) : actor {
        icrc1_transfer : (TransferArgs) -> async TransferResult
      };
      switch (await frntrActor.icrc1_transfer({
        to              = { owner = Principal.fromText("aaaaa-aa"); subaccount = null };
        amount          = cost;
        fee             = ?10_000;
        memo            = null;
        from_subaccount = null;
        created_at_time = null;
      })) {
        case (#Err(e)) { return #err("FRNTR burn failed: " # debug_show(e)) };
        case (#Ok(_))  {};
      };
    } else {
      // Testnet fallback: deduct from local balance
      if (player.frntBalance < cost) {
        return #err("Insufficient FRNTR (local balance)");
      };
      players.add(caller, { player with frntBalance = player.frntBalance - cost });
    };

    // Track the burn in global stats
    statsState.totalFRNTRBurned += cost;

    let thirtyMinNs : Nat = 1_800_000_000_000;
    let record : GameTypes.Survey = {
      plotId;
      surveyor    = caller;
      status      = #InProgress;
      unlockCost  = cost;
      startTime   = now;
      duration    = thirtyMinNs;
      result      = null;
    };
    surveys.add(key, record);

    let view : GameTypes.SurveyView = {
      plotId;
      status           = #InProgress;
      unlockCost       = cost;
      startTime        = now;
      secondsRemaining = thirtyMinNs / 1_000_000_000;
      result           = null;
    };
    #ok(view);
  };

  /// Get the current survey status for a plot.
  /// If the timer has expired the result is auto-computed and the survey is
  /// promoted to #Completed — the updated record is persisted.
  public shared ({ caller }) func getSurveyStatus(plotId : Text) : async { #ok : GameTypes.SurveyView; #err : Text } {
    if (caller.isAnonymous()) { return #err("Must be authenticated") };
    let key = surveyKey(plotId, caller);
    let record = switch (surveys.get(key)) {
      case (null) {
        // No survey started — return a locked placeholder with the cost
        let cost = surveyCostForPlot(plotId);
        return #ok({
          plotId;
          status           = #Locked;
          unlockCost       = cost;
          startTime        = 0;
          secondsRemaining = 0;
          result           = null;
        });
      };
      case (?r) { r };
    };

    let now = Time.now();
    switch (record.status) {
      case (#Completed) {
        #ok({
          plotId;
          status           = #Completed;
          unlockCost       = record.unlockCost;
          startTime        = record.startTime;
          secondsRemaining = 0;
          result           = record.result;
        });
      };
      case (#InProgress) {
        let elapsed : Int = now - record.startTime;
        let durInt  : Int = record.duration.toInt();
        if (elapsed >= durInt) {
          // Timer expired — compute and persist result
          let res = buildSurveyResult(plotId);
          let completed : GameTypes.Survey = { record with status = #Completed; result = ?res };
          surveys.add(key, completed);
          #ok({
            plotId;
            status           = #Completed;
            unlockCost       = record.unlockCost;
            startTime        = record.startTime;
            secondsRemaining = 0;
            result           = ?res;
          });
        } else {
          let remaining : Nat = ((durInt - elapsed) / 1_000_000_000).toNat();
          #ok({
            plotId;
            status           = #InProgress;
            unlockCost       = record.unlockCost;
            startTime        = record.startTime;
            secondsRemaining = remaining;
            result           = null;
          });
        };
      };
      case (#Locked) {
        #ok({
          plotId;
          status           = #Locked;
          unlockCost       = record.unlockCost;
          startTime        = 0;
          secondsRemaining = 0;
          result           = null;
        });
      };
    };
  };

  /// Get the completed survey result for a plot.
  /// Returns #err if the survey has not been started or the timer hasn't expired.
  public shared ({ caller }) func getSurveyResult(plotId : Text) : async { #ok : GameTypes.SurveyResult; #err : Text } {
    if (caller.isAnonymous()) { return #err("Must be authenticated") };
    let key = surveyKey(plotId, caller);
    let record = switch (surveys.get(key)) {
      case (null) { return #err("No survey started for this plot. Call startSurvey first.") };
      case (?r)   { r };
    };
    switch (record.status) {
      case (#Locked)     { #err("Survey has not been started.") };
      case (#InProgress) {
        let now = Time.now();
        let elapsed : Int = now - record.startTime;
        let durInt  : Int = record.duration.toInt();
        if (elapsed >= durInt) {
          // Auto-complete if timer has expired
          let res = buildSurveyResult(plotId);
          surveys.add(key, { record with status = #Completed; result = ?res });
          #ok(res);
        } else {
          let remaining : Nat = ((durInt - elapsed) / 1_000_000_000).toNat();
          #err("Survey in progress. " # remaining.toText() # " seconds remaining.");
        };
      };
      case (#Completed) {
        switch (record.result) {
          case (?res) { #ok(res) };
          case (null) {
            let res = buildSurveyResult(plotId);
            surveys.add(key, { record with result = ?res });
            #ok(res);
          };
        };
      };
    };
  };

  /// Returns the survey cost (in FRNTR e8s) for a given plot.
  public query func getSurveyCost(plotId : Text) : async Nat {
    surveyCostForPlot(plotId);
  };

  // ─── Upgrade hooks — persist heap state to stable arrays ─────────────────


  // ─── ICP/USD price cache ────────────────────────────────────────────────
  /// Stable cache for ICP/USD price — survives canister upgrades.
  stable var lastPriceValue     : Float = 0.0;
  stable var lastPriceTimestamp : Int   = 0;

  // HTTP outcall types for IC management canister
  type HttpHeader = { name : Text; value : Text };
  type HttpRequest = {
    url               : Text;
    max_response_bytes : ?Nat64;
    headers           : [HttpHeader];
    body              : ?Blob;
    method            : { #get; #post; #head };
    transform         : ?{
      function : shared query ({ response : HttpResponse; context : Blob }) -> async HttpResponse;
      context  : Blob;
    };
  };
  type HttpResponse = {
    status  : Nat;
    headers : [HttpHeader];
    body    : Blob;
  };

  let IC_MANAGEMENT : actor {
    http_request : HttpRequest -> async HttpResponse;
  } = actor("aaaaa-aa");

  /// Parse a USD price float from a CoinGecko JSON response.
  /// Input looks like: {"internet-computer":{"usd":12.34}}
  /// Strategy: find "usd": then scan forward collecting digit/dot chars.
  private func parseUsdPrice(json : Text) : ?Float {
    // Find the position after "usd": by splitting on that literal
    let parts = json.split(#text("\"usd\":")).toArray();
    if (parts.size() < 2) { return null };
    // parts[1] starts right after "usd": — e.g. "12.34}}"
    let after = parts[1];
    // Collect leading digit/dot characters into a number string
    let numText = label collect : Text {
      var acc = "";
      for (c in after.chars()) {
        if ((c >= '0' and c <= '9') or c == '.') {
          acc := acc # Text.fromChar(c);
        } else if (acc.size() > 0) {
          break collect acc;
        };
        // skip leading whitespace before digits
      };
      break collect acc;
    };
    if (numText.size() == 0) { return null };
    // Convert "whole.frac" to Float
    let dotParts = numText.split(#char('.')).toArray();
    switch (dotParts.size()) {
      case (1) {
        switch (Nat.fromText(dotParts[0])) {
          case (?w) { ?(w.toFloat()) };
          case null { null };
        };
      };
      case (2) {
        switch (Nat.fromText(dotParts[0]), Nat.fromText(dotParts[1])) {
          case (?w, ?f) {
            let divisor = Float.pow(10.0, dotParts[1].size().toFloat());
            ?(w.toFloat() + f.toFloat() / divisor);
          };
          case _ { null };
        };
      };
      case _ { null };
    };
  };

  /// ICP/USD price oracle — performs HTTP outcall to CoinGecko API with 60s cache.
  /// URL: https://api.coingecko.com/api/v3/simple/price?ids=internet-computer&vs_currencies=usd
  /// Returns the current ICP/USD price as a Float.
  public func getIcpUsdPrice() : async Float {
    let sixtySecondsNs : Int = 60_000_000_000;
    let now = Time.now();
    // Return cached value if within 60 seconds
    if (lastPriceTimestamp > 0 and now < lastPriceTimestamp + sixtySecondsNs) {
      return lastPriceValue;
    };
    // Fetch fresh price via HTTP outcall
    let url = "https://api.coingecko.com/api/v3/simple/price?ids=internet-computer&vs_currencies=usd";
    let request : HttpRequest = {
      url;
      max_response_bytes = ?2_000 : ?Nat64;
      headers = [{ name = "User-Agent"; value = "frontier-missile-horizon/1.0" }];
      body = null;
      method = #get;
      transform = null;
    };
    try {
      let response = await IC_MANAGEMENT.http_request(request);
      let bodyText = switch (response.body.decodeUtf8()) {
        case (?t) { t };
        case null { return lastPriceValue };
      };
      switch (parseUsdPrice(bodyText)) {
        case (?price) {
          lastPriceValue     := price;
          lastPriceTimestamp := now;
          price;
        };
        case null { lastPriceValue };
      };
    } catch (_) {
      // On failure, return last known price
      lastPriceValue;
    };
  };

  /// Returns the cached ICP/USD price without an HTTP outcall.
  /// Returns 0.0 if the price has never been fetched.
  public query func getIcpUsdPriceCached() : async Float {
    lastPriceValue;
  };

  /// Returns the currently approved DEX canister principal for liquidity withdrawals.
  /// Set via setApprovedLiquidityCanister (admin only).
  public query func getApprovedLiquidityCanister() : async ?Text {
    approvedDexPrincipalText;
  };

  /// Returns the caller's real ICP balance from the on-chain ICP ledger (ryjl3-tyaaa-aaaaa-aaaba-cai).
  /// Result is in raw e8s (divide by 100_000_000 for ICP display).
  public shared func getIcpBalance(principal : Principal) : async Nat {
    let icpLedger = actor(ICP_LEDGER_ID) : actor {
      icrc1_balance_of : ({ owner : Principal; subaccount : ?Blob }) -> async Nat
    };
    await icpLedger.icrc1_balance_of({ owner = principal; subaccount = null });
  };

  system func preupgrade() {
    stablePlots          := plots.toArray();
    stablePlayers        := players.toArray();
    stableCombatLog      := combatLog.toArray();
    stableLeaderboard    := _leaderboard.toArray();
    stableInterceptors   := interceptors.toArray();
    stableGeneratorTiers := generatorTiers.toArray();
    stablePlotRarities   := _plotRarities.toArray();
    stableUsernames      := usernames.toArray();
    stableFaucetClaims   := faucetClaims.toArray();
    stableClaimTimes     := claimTimes.toArray();
    stableStatsState     := (
      statsState.totalFRNTRBurned,
      statsState.totalFRNTRMined,
      statsState.activePlayers,
    );
    stablePlotSoldCount  := plotSoldState.count;
    stableSubParcels     := subParcels.toArray();
    stableTreasuryPots   := (treasuryPots.devPot, treasuryPots.leaderboardPot, treasuryPots.liquidityPot);
    stableSurveys        := surveys.toArray();
  };

  // ─── Free stable arrays after upgrade to reclaim heap memory ─────────────

  system func postupgrade() {
    stablePlots          := [];
    stablePlayers        := [];
    stableCombatLog      := [];
    stableLeaderboard    := [];
    stableInterceptors   := [];
    stableGeneratorTiers := [];
    stablePlotRarities   := [];
    stableUsernames      := [];
    stableFaucetClaims   := [];
    stableClaimTimes     := [];
    stableSubParcels     := [];
    stableSurveys        := [];
    if (stableTreasuryPots.0 != 0 or stableTreasuryPots.1 != 0 or stableTreasuryPots.2 != 0) {
      treasuryPots.devPot        := stableTreasuryPots.0;
      treasuryPots.leaderboardPot := stableTreasuryPots.1;
      treasuryPots.liquidityPot  := stableTreasuryPots.2;
      stableTreasuryPots         := (0, 0, 0);
    };
  };
};
