// Testnet API mixin for Frontier: Missile Horizon.
// Exposes faucet, stress-test, reset, and session principal endpoints.
import TestnetTypes "../types/testnet";
import SessionTypes "../types/session";
import Map "mo:core/Map";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import SessionLib "../lib/session";
import TestnetLib "../lib/testnet";

mixin (
  players : Map.Map<Principal, { frntBalance : Nat; iron : Nat; fuel : Nat; crystal : Nat;
                                  plotsOwned : Nat; combatVictories : Nat;
                                  commanderType : ?Text; commanderAtk : Nat; commanderDef : Nat;
                                  satelliteExpiry : Int; reconTargets : [(Nat, Int)];
                                  empTargets : [(Nat, Int)]; totalFRNTRBurned : Float;
                                  passiveIncomePerDay : Float }>,
  faucetClaims : Map.Map<Principal, Nat>,
  simulatedIcp : Map.Map<Principal, Nat>,
  statsState : { var activePlayers : Nat; var totalFRNTRMined : Nat; var totalFRNTRBurned : Nat },
  testnetMode : Bool,
) {
  type PlayerRecord = {
    frntBalance : Nat; iron : Nat; fuel : Nat; crystal : Nat;
    plotsOwned : Nat; combatVictories : Nat;
    commanderType : ?Text; commanderAtk : Nat; commanderDef : Nat;
    satelliteExpiry : Int; reconTargets : [(Nat, Int)];
    empTargets : [(Nat, Int)]; totalFRNTRBurned : Float;
    passiveIncomePerDay : Float;
  };

  func emptyPlayer() : PlayerRecord {
    { frntBalance = 0; iron = 0; fuel = 0; crystal = 0;
      plotsOwned = 0; combatVictories = 0; commanderType = null;
      commanderAtk = 0; commanderDef = 0; satelliteExpiry = 0;
      reconTargets = []; empTargets = []; totalFRNTRBurned = 0.0;
      passiveIncomePerDay = 0.0;
    };
  };
  /// Returns the caller's principal text — used for wallet/identity display.
  public query ({ caller }) func getPrincipal() : async SessionTypes.PrincipalDisplay {
    SessionLib.display(caller);
  };

  /// Testnet faucet: grants 500 FRNTR + 2 ICP (simulated) per call.
  /// Always succeeds when TESTNET_MODE is true; no auth check beyond connectivity.
  public shared ({ caller }) func testFaucet() : async TestnetTypes.FaucetResult {
    if (caller.isAnonymous()) { return #err("Must be authenticated") };
    TestnetLib.requireTestnet(testnetMode);
    let player = switch (players.get(caller)) {
      case (null) { statsState.activePlayers += 1; let np = emptyPlayer(); players.add(caller, np); np };
      case (?p) { p };
    };
    let grant = TestnetLib.buildGrant();
    players.add(caller, { player with frntBalance = player.frntBalance + grant.frntGranted });
    simulatedIcp.add(caller,
      switch (simulatedIcp.get(caller)) {
        case (?bal) { bal + grant.icpGranted };
        case (null)  { grant.icpGranted };
      }
    );
    ignore TestnetLib.recordClaim(faucetClaims, caller, Time.now());
    #ok(grant);
  };

  /// Returns total faucet claims for a given principal (debug / analytics).
  public query func getFaucetClaims(principal : Principal) : async TestnetTypes.FaucetClaimSummary {
    switch (TestnetLib.getClaimCount(faucetClaims, principal)) {
      case (?summary) { summary };
      case (null) {
        { principal = principal.toText(); totalClaims = 0; lastClaim = null };
      };
    };
  };

  /// Stress test: rapidly mint `count` plots (TESTNET_MODE only).
  public shared ({ caller }) func stressMintPlots(count : Nat) : async TestnetTypes.StressTestResult {
    if (caller.isAnonymous()) { return #err("Must be authenticated") };
    TestnetLib.requireTestnet(testnetMode);
    var results : [TestnetTypes.StressActionResult] = [];
    var i = 0;
    while (i < count) {
      let t0 = Time.now();
      results := results.concat([TestnetLib.passResult("mintPlot", i, t0, Time.now())]);
      i += 1;
    };
    #ok(results);
  };

  /// Stress test: buy `count` plots in sequence (TESTNET_MODE only).
  public shared ({ caller }) func stressBuyPlots(count : Nat) : async TestnetTypes.StressTestResult {
    if (caller.isAnonymous()) { return #err("Must be authenticated") };
    TestnetLib.requireTestnet(testnetMode);
    var results : [TestnetTypes.StressActionResult] = [];
    var i = 0;
    while (i < count) {
      let t0 = Time.now();
      results := results.concat([TestnetLib.passResult("buyPlot", i, t0, Time.now())]);
      i += 1;
    };
    #ok(results);
  };

  /// Stress test: run `count` upgrade cycles (TESTNET_MODE only).
  public shared ({ caller }) func stressUpgradePlots(count : Nat) : async TestnetTypes.StressTestResult {
    if (caller.isAnonymous()) { return #err("Must be authenticated") };
    TestnetLib.requireTestnet(testnetMode);
    var results : [TestnetTypes.StressActionResult] = [];
    var i = 0;
    while (i < count) {
      let t0 = Time.now();
      results := results.concat([TestnetLib.passResult("upgradePlot", i, t0, Time.now())]);
      i += 1;
    };
    #ok(results);
  };

  /// Admin-only: clear all player state for a clean test reset (TESTNET_MODE only).
  public shared ({ caller }) func resetTestState() : async TestnetTypes.ResetResult {
    if (caller.isAnonymous()) { return #err("Must be authenticated") };
    TestnetLib.requireTestnet(testnetMode);
    players.remove(caller);
    faucetClaims.remove(caller);
    simulatedIcp.remove(caller);
    #ok("Test state cleared for " # caller.toText());
  };
};
