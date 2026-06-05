/// Mixin: FRNTR ledger principal management.
/// Included in main.mo to expose setFrntrLedger (admin-only) and
/// getFrntrLedger (public query).
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";

mixin (frntrLedgerState : { var frntrLedger : Text; var adminPrincipal : Text }) {

  /// Set the deployed FRNTR token canister ID.
  /// Admin-only; call this once after the token canister is deployed.
  public shared ({ caller }) func setFrntrLedger(canisterId : Principal) : async () {
    if (caller.toText() != frntrLedgerState.adminPrincipal) {
      Runtime.trap("Unauthorized: only admin can call setFrntrLedger");
    };
    frntrLedgerState.frntrLedger := canisterId.toText();
  };

  /// Return the current FRNTR ledger canister ID.
  public query func getFrntrLedger() : async Text {
    frntrLedgerState.frntrLedger;
  };
}
