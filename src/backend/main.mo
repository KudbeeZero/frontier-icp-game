
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


actor {
  /// TESTNET_MODE = true: enables faucet endpoint for testing without real ICP.
  /// Set to false before mainnet launch.
  let TESTNET_MODE : Bool = true;

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

  type PlotState = {
    plotId : Nat;
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
  };

  type CombatEvent = {
    timestamp : Int;
    attacker : Principal;
    fromPlot : Nat;
    toPlot : Nat;
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

  let plots = Map.empty<Nat, PlotState>();
  let players = Map.empty<Principal, PlayerState>();
  let combatLog = Map.empty<Int, CombatEvent>();
  let _leaderboard = Map.empty<Principal, LeaderEntry>();
  let interceptors = Map.empty<Nat, Text>();

  // Generator tier per plot
  let generatorTiers = Map.empty<Nat, GameTypes.GeneratorTier>();
  // Plot rarities for price lookups
  let _plotRarities = Map.empty<Nat, CommonTypes.PlotRarity>();
  // Username registry: principal -> username
  let usernames = Map.empty<Principal, Text>();
  // Global stats tracking
  let statsState = { var totalFRNTRBurned : Nat = 0; var totalFRNTRMined : Nat = 0; var activePlayers : Nat = 0 };
  // Plot sold counter
  let plotSoldState = { var count : Nat = 0 };
  // Pricing config (default midpoints)
  let pricingState = { var pricing : CommonTypes.PlotPricing = CommonTypes.defaultPricing };

  // Admin state -- wrapped in a record so it can be mutated via reference
  let adminState = { var adminPrincipal : Text = "aaaaa-aa" };
  // Treasury canister principal -- update after treasury canister is deployed
  let treasuryState = { var treasuryPrincipal : Text = "aaaaa-aa" };

  // Faucet claims map: principal -> total claim count
  let faucetClaims = Map.empty<Principal, Nat>();
  // Simulated ICP balances for testnet (principal -> e8s)
  let simulatedIcp = Map.empty<Principal, Nat>();
  // ─── Core stats / tokenomics mixin ───────────────────────────────────────
  include CoreApiMixin(statsState, plotSoldState, generatorTiers, plots);


  // ─── Session / principal display ─────────────────────────────────────────

  /// Returns the caller's principal display info for wallet/identity UI.
  public query ({ caller }) func getPrincipal() : async SessionTypes.PrincipalDisplay {
    SessionLib.display(caller);
  };

  // ─── Testnet faucet (new — 500 FRNTR + 2 ICP per click) ─────────────────

  /// Testnet faucet: grants 500 FRNTR + 2 ICP (simulated) per click.
  /// No cooldown, no auth check beyond TESTNET_MODE=true.
  public shared ({ caller }) func testFaucetV2() : async TestnetTypes.FaucetResult {
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
    let grant = TestnetLib.buildGrant();
    players.add(caller, { player with frntBalance = player.frntBalance + grant.frntGranted });
    statsState.totalFRNTRMined += grant.frntGranted;
    simulatedIcp.add(caller,
      switch (simulatedIcp.get(caller)) {
        case (?bal) { bal + grant.icpGranted };
        case (null)  { grant.icpGranted };
      }
    );
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

  // ─── Stress-test endpoints (TESTNET_MODE only) ───────────────────────────

  /// Rapidly mint `count` unowned plots (TESTNET_MODE only).
  public shared ({ caller }) func stressMintPlots(count : Nat) : async TestnetTypes.StressTestResult {
    if (not TESTNET_MODE) { return #err("Stress tests only available in testnet mode") };
    if (caller.isAnonymous()) { return #err("Must be authenticated") };
    var results : [TestnetTypes.StressActionResult] = [];
    var i = 0;
    let startId : Nat = 900_000;
    while (i < count) {
      let t0 = Time.now();
      let plotId = startId + i;
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
      let plotId = 900_000 + i;
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
              let np : PlayerState = { (emptyPlayerState()) with frntBalance = 60_000 };
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
      let plotId = 900_000 + (i % 10);
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
    simulatedIcp.remove(caller);
    #ok("Test state cleared for " # caller.toText());
  };

  func validatePlotExists(plotId : Nat) : PlotState {
    switch (plots.get(plotId)) {
      case (null) { Runtime.trap("Plot does not exist!") };
      case (?plot) { plot };
    };
  };

  public shared ({ caller }) func assignInterceptor(plotId : Nat, interceptorType : Text) : async () {
    let _ = validatePlotExists(plotId);
    switch (interceptorType) {
      case ("IRON-DOME-F") { };
      case ("THAAD-X") { };
      case ("AEGIS-S") { };
      case (_) { Runtime.trap("Invalid interceptor type") };
    };
    interceptors.add(plotId, interceptorType);
  };

  public query ({ caller }) func getAssignedInterceptor(plotId : Nat) : async ?Text {
    interceptors.get(plotId);
  };

  // Returns daily FRNTR rate for a plot (base 7 + nexus electricity bonus)
  // Returns daily FRNTR rate for a plot using canonical formula: base 7 + (tierIndex * 3) + nexus bonus
  func plotDailyRate(plotId : Nat) : Float {
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

  public query func getPassiveIncome(plotId : Nat) : async Float {
    plotDailyRate(plotId);
  };

  public query func isSubParcelLocked(plotId : Nat) : async Bool {
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

  /// Mine resources from an owned plot.
  public shared ({ caller }) func mineResources(plotId : Nat) : async { #ok : GameTypes.MineResult; #err : Text } {
    if (caller.isAnonymous()) { return #err("Anonymous users cannot mine") };
    let plot = switch (plots.get(plotId)) {
      case (null) { return #err("Plot not found") };
      case (?p)   { p };
    };
    if (plot.owner != ?caller) { return #err("Not your plot") };

    let efficiencyFloat : Float = plot.richness.toFloat() / 100.0;
    let seed : Int = Time.now() % 1_000_000;
    let yields = GameLib.computeMineYields(plot.biome, efficiencyFloat, seed);

    let genTier = switch (generatorTiers.get(plotId)) {
      case (?t)   { t };
      case (null) { #None };
    };
    let frntRate : Float = 7.0 + GameLib.tierBonus(genTier);

    let player = switch (players.get(caller)) {
      case (null) { emptyPlayerState() };
      case (?p)   { p };
    };
    let frntGainFloat = frntRate / 24.0;
    let frntGain : Nat = if (frntGainFloat >= 1.0) { frntGainFloat.toInt().toNat() } else { 0 };
    players.add(caller, { player with frntBalance = player.frntBalance + frntGain });
    statsState.totalFRNTRMined += frntGain;

    #ok({ plotId; resourceYields = yields; frntRate; efficiency = efficiencyFloat });
  };

  /// Testnet faucet: grants exactly 500 FRNTR + 2 ICP (200_000_000 e8s simulated) per click.
  /// No cooldown, no rate limit.
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
    players.add(caller, { player with frntBalance = player.frntBalance + 500 });
    statsState.totalFRNTRMined += 500;
    simulatedIcp.add(caller,
      switch (simulatedIcp.get(caller)) {
        case (?bal) { bal + 200_000_000 };
        case (null)  { 200_000_000 };
      }
    );
    #ok("Testnet faucet: 500 FRNTR and 2 ICP credited.");
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

  public query ({ caller }) func getPlayerState() : async {
    ownedPlots         : [Text];
    frntBalance        : Nat;
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
        ownedPlots = []; frntBalance = 0; resourceBalances = [];
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
        let idText = plotId.toText();
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

    {
      ownedPlots          = ownedList;
      frntBalance         = base.frntBalance;
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
  public query func getPlayerStateByPrincipal(principal : Principal) : async {
    ownedPlots         : [Text];
    frntBalance        : Nat;
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
        let idText = plotId.toText();
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

    {
      ownedPlots          = ownedList;
      frntBalance         = base.frntBalance;
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

  public shared ({ caller }) func purchasePlot(plotId : Nat) : async { #ok : Text; #err : Text } {
    if (caller.isAnonymous()) { return #err("Anonymous users cannot purchase plots") };
    let plot = validatePlotExists(plotId);

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

    let player = switch (players.get(caller)) {
      case (null) {
        statsState.activePlayers += 1;
        let newPlayer : PlayerState = { (emptyPlayerState()) with frntBalance = 600 };
        players.add(caller, newPlayer);
        newPlayer;
      };
      case (?player) { player };
    };

    if (player.frntBalance < 100) { return #err("Not enough FRNTR") };
    let updatedPlayer : PlayerState = {
      player with
      frntBalance = player.frntBalance - 100;
      plotsOwned = player.plotsOwned + 1;
      totalFRNTRBurned = player.totalFRNTRBurned + 100.0;
    };
    players.add(caller, updatedPlayer);
    statsState.totalFRNTRBurned += 100;
    plotSoldState.count += 1;

    let updatedPlot : PlotState = {
      plot with
      owner = ?caller;
      purchaseTimestamp = ?Time.now();
    };
    plots.add(plotId, updatedPlot);

    // Fire-and-forget: notify treasury of plot purchase so it can apply the
    // 25/25/50 dev/leaderboard/liquidity split. Amount = 100 FRNTR game units.
    ignore async {
      let treasury = actor(treasuryState.treasuryPrincipal) : actor {
        notifyPlotPurchase : (Nat, Principal) -> async {
          #ok;
          #err : {
            #NotAuthorized;
            #InvalidUsername;
            #UsernameTaken;
            #InsufficientFunds;
            #InvalidDEX;
            #InvalidPercentages;
            #NotFound;
          };
        };
      };
      ignore await treasury.notifyPlotPurchase(100, caller);
    };

    #ok("Purchase successful, congrats!");
  };

  /// Seed plots from the frontend (admin only). Skips plots that already exist.
  public shared ({ caller }) func initPlots(plotData : [(Nat, Text, Float, Float, Nat)]) : async () {
    if (caller.toText() != adminState.adminPrincipal) {
      Runtime.trap("Unauthorized");
    };
    for ((id, biome, lat, lng, richness) in plotData.vals()) {
      if (plots.get(id) == null) {
        plots.add(id, {
          plotId = id; biome; richness; lat; lng;
          owner = null; nftTokenId = null;
          iron = 0; fuel = 0; crystal = 0;
          lastTick = Time.now();
          defenses = { turrets = 0; shields = 0; walls = 0 };
          facilities = { electricityPlant = false; blockchainNode = false; dataCentre = false; aiLab = false };
          attackCooldown = 0; faction = null; morale = 100;
          interceptorSystem = null; purchaseTimestamp = null;
          nexusElectricityLevel = 0;
        });
      };
    };
  };

  /// Returns the total number of plots currently stored.
  public query func getPlotCount() : async Nat { plots.size() };

  /// Returns all plots that have an owner as (plotId, ownerPrincipalText) pairs.
  public query func getAllPlotOwners() : async [(Nat, Text)] {
    var result : [(Nat, Text)] = [];
    for ((id, plot) in plots.entries()) {
      switch (plot.owner) {
        case (?_owner) { result := result.concat([(id, _owner.toText())]) };
        case (null) {};
      };
    };
    result;
  };

  public shared ({ caller }) func launchMissile(
    fromPlotId : Nat,
    toPlotId : Nat,
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

    let _ = switch (toPlot.owner) {
      case (null) { toPlot.defenses };
      case (?_owner) { toPlot.defenses };
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
    fromPlot : Nat,
    toPlot : Nat,
    success : Bool,
    atkPower : Nat,
    defPower : Nat,
    intercepted : Bool,
    interceptorType : ?Text,
    missileType : ?Text,
  ) {
    let combatEvent : CombatEvent = {
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
    combatLog.add(timestamp, combatEvent);
  };

  func resolveMissileWithoutInterceptor(
    caller : Principal,
    fromPlot : Nat,
    toPlot : Nat,
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

  public query ({ caller }) func getAdjacentPlots(plotId : Nat) : async [Nat] {
    if (plotId >= 100) { return [] };

    let plot = validatePlotExists(plotId);
    let iterator = plots.keys();
    let resultArray : [Nat] = iterator.toArray().sort().filter(
      func(id) {
        let nextPlot = validatePlotExists(id);
        id != plotId and (Float.abs(latDistance(plot.lat, nextPlot.lat) * 1.5) <= 15.0);
      }
    );
    resultArray.sliceToArray(0, Float.min(6.0, resultArray.size().toFloat()).toInt());
  };
};
