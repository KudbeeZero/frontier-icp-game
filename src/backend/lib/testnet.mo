// Testnet domain business logic for Frontier: Missile Horizon.
// Provides faucet, stress-test, and test-state reset helpers.
import Map "mo:core/Map";
import Types "../types/testnet";
import Runtime "mo:core/Runtime";

module {
  // Amount of FRNTR granted per faucet click.
  public let FAUCET_FRNT : Nat = 500;
  // Simulated ICP per faucet click (in e8s: 2 ICP = 200_000_000 e8s).
  public let FAUCET_ICP_E8S : Nat = 200_000_000;

  /// Validate that the testnet mode flag is enabled; traps if not.
  public func requireTestnet(testnetMode : Bool) {
    if (not testnetMode) {
      Runtime.trap("Testnet-only endpoint; TESTNET_MODE is false");
    };
  };

  /// Build a FaucetGrant record from fixed constants.
  public func buildGrant() : Types.FaucetGrant {
    { frntGranted = FAUCET_FRNT; icpGranted = FAUCET_ICP_E8S };
  };

  /// Increment the claim counter for a principal and return updated count.
  public func recordClaim(
    claimMap : Map.Map<Principal, Nat>,
    principal : Principal,
    now : Int,
  ) : Nat {
    ignore now;
    let prev = switch (claimMap.get(principal)) {
      case (?n) { n };
      case (null) { 0 };
    };
    let next = prev + 1;
    claimMap.add(principal, next);
    next;
  };

  /// Retrieve total faucet claims for a given principal.
  public func getClaimCount(
    claimMap : Map.Map<Principal, Nat>,
    principal : Principal,
  ) : ?Types.FaucetClaimSummary {
    switch (claimMap.get(principal)) {
      case (null) { null };
      case (?n) {
        ?{
          principal   = principal.toText();
          totalClaims = n;
          lastClaim   = null;
        };
      };
    };
  };

  /// Build a passing StressActionResult with a duration in nanoseconds.
  public func passResult(action : Text, index : Nat, startNs : Int, endNs : Int) : Types.StressActionResult {
    {
      action;
      index;
      ok          = true;
      durationMs  = (endNs - startNs) / 1_000_000;
      errorMsg    = null;
    };
  };

  /// Build a failing StressActionResult.
  public func failResult(action : Text, index : Nat, startNs : Int, endNs : Int, msg : Text) : Types.StressActionResult {
    {
      action;
      index;
      ok          = false;
      durationMs  = (endNs - startNs) / 1_000_000;
      errorMsg    = ?msg;
    };
  };
};
