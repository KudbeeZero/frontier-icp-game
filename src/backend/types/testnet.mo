// Testnet domain types for Frontier: Missile Horizon.
// Used by the faucet, stress-test endpoints, and test-state reset.
module {
  // Result of a testnet faucet claim.
  public type FaucetResult = {
    #ok  : FaucetGrant;
    #err : Text;
  };

  // Tokens granted on each faucet click.
  public type FaucetGrant = {
    frntGranted : Nat;   // 500 FRNTR
    icpGranted  : Nat;   // 2 ICP (simulated, in e8s)
  };

  // Per-principal faucet claim record (for debugging / analytics).
  public type FaucetRecord = {
    principal  : Principal;
    totalClaims : Nat;
    lastClaim  : Int;   // nanoseconds since epoch
  };

  // Summary returned by getFaucetClaims().
  public type FaucetClaimSummary = {
    principal   : Text;
    totalClaims : Nat;
    lastClaim   : ?Int;
  };

  // One stress-test action result.
  public type StressActionResult = {
    action      : Text;    // "mintPlot" | "buyPlot" | "upgradePlot"
    index       : Nat;     // sequential index within the test run
    ok          : Bool;
    durationMs  : Int;
    errorMsg    : ?Text;
  };

  // Full stress-test run result.
  public type StressTestResult = {
    #ok  : [StressActionResult];
    #err : Text;
  };

  // Summary of a canister state reset.
  public type ResetResult = {
    #ok  : Text;
    #err : Text;
  };
};
