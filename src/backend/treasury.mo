import Principal "mo:core/Principal";
import Nat "mo:core/Nat";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Int "mo:core/Int";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Cycles "mo:core/Cycles";
import Order "mo:core/Order";

/// Treasury Canister for Frontier: Missile Horizon
/// Handles 25/25/50 revenue split on plot purchases and FRNTR fee routing.
actor {

  // ---------------------------------------------------------------------------
  // Error type
  // ---------------------------------------------------------------------------
  public type TreasuryError = {
    #NotAuthorized;
    #InvalidUsername;
    #UsernameTaken;
    #InsufficientFunds;
    #InvalidDEX;
    #InvalidPercentages;
    #NotFound;
  };

  // ---------------------------------------------------------------------------
  // Leaderboard entry returned to callers
  // ---------------------------------------------------------------------------
  public type LeaderboardEntry = {
    rank : Nat;
    principal : Principal;
    username : Text;
    frntrBalance : Nat;
  };

  // ---------------------------------------------------------------------------
  // Stable state — pots (in ICP e8s or game-unit Nat)
  // ---------------------------------------------------------------------------
  /// ICP accumulated for developer use
  var developerTreasuryICP : Nat = 0;
  /// FRNTR accumulated for developer use
  var developerTreasuryFRNTR : Nat = 0;
  /// ICP pot reserved for leaderboard rewards
  var leaderboardPotICP : Nat = 0;
  /// ICP pot reserved exclusively for DEX liquidity seeding
  var liquidityPotICP : Nat = 0;

  // ---------------------------------------------------------------------------
  // Stable fee percentages (must always sum to 100)
  // ---------------------------------------------------------------------------
  var devFeePercent : Nat = 25;
  var leaderboardFeePercent : Nat = 25;
  var liquidityFeePercent : Nat = 50;

  // ---------------------------------------------------------------------------
  // Admin principal — replace placeholder before mainnet
  // ---------------------------------------------------------------------------
  var adminPrincipal : Principal = Principal.fromText("aaaaa-aa");

  // ---------------------------------------------------------------------------
  // FRNTR ledger principal — stub until real ICRC-1 ledger is deployed
  // ---------------------------------------------------------------------------
  var frntLedgerPrincipal : Principal = Principal.fromText("aaaaa-aa");

  // ---------------------------------------------------------------------------
  // Approved DEX canisters for liquidity pot withdrawals
  // ---------------------------------------------------------------------------
  var approvedDEXCanisters : [Principal] = [];

  // ---------------------------------------------------------------------------
  // Username registry — persisted via enhanced orthogonal persistence
  // ---------------------------------------------------------------------------
  /// Maps Principal → username
  let usernames = Map.empty<Principal, Text>();
  /// Reverse map for uniqueness checks: username → Principal
  let usernameIndex = Map.empty<Text, Principal>();

  // ---------------------------------------------------------------------------
  // Local FRNTR balance cache — used for leaderboard until real ledger wired
  // ---------------------------------------------------------------------------
  let playerFrntrBalances = Map.empty<Principal, Nat>();

  // ---------------------------------------------------------------------------
  // Audit log: (timestamp, principal text, amount, action)
  // ---------------------------------------------------------------------------
  let auditEntries = Map.empty<Int, (Text, Nat, Text)>();

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /// Guard: trap or return #err if caller is not admin.
  private func requireAdmin(caller : Principal) : { #ok; #err : TreasuryError } {
    if (caller == adminPrincipal) { #ok } else { #err(#NotAuthorized) };
  };

  /// Append an entry to the audit log.
  private func logAudit(p : Principal, amount : Nat, action : Text) {
    let ts = Time.now();
    auditEntries.add(ts, (p.toText(), amount, action));
  };

  /// Validate username: 3-16 chars, alphanumeric + underscore only.
  private func validUsername(u : Text) : Bool {
    let len = u.size();
    if (len < 3 or len > 16) { return false };
    for (c in u.chars()) {
      let ok = (c >= 'a' and c <= 'z') or
               (c >= 'A' and c <= 'Z') or
               (c >= '0' and c <= '9') or
               c == '_';
      if (not ok) { return false };
    };
    true;
  };

  // ---------------------------------------------------------------------------
  // PUBLIC — Revenue intake
  // ---------------------------------------------------------------------------

  /// Called by the game canister after every plot purchase.
  /// Splits `amount` using precise Nat arithmetic:
  ///   dev = amount * 25 / 100
  ///   lb  = amount * 25 / 100
  ///   liq = amount - dev - lb  (absorbs any integer rounding remainder)
  /// This guarantees dev + lb + liq == amount exactly.
  public shared ({ caller }) func notifyPlotPurchase(
    amount : Nat,
    buyer : Principal,
  ) : async { #ok; #err : TreasuryError } {
    let dev = amount * 25 / 100;
    let lb  = amount * 25 / 100;
    let liq = amount - dev - lb;
    developerTreasuryICP += dev;
    leaderboardPotICP    += lb;
    liquidityPotICP      += liq;
    logAudit(buyer, amount, "plotPurchase:dev=" # Nat.toText(dev) # ":lb=" # Nat.toText(lb) # ":liq=" # Nat.toText(liq));
    #ok;
  };

  /// Consolidated query returning all three pot balances at once.
  public query func getPotBalances() : async {
    developerTreasuryICP   : Nat;
    developerTreasuryFRNTR : Nat;
    leaderboardPotICP      : Nat;
    liquidityPotICP        : Nat;
  } {
    { developerTreasuryICP; developerTreasuryFRNTR; leaderboardPotICP; liquidityPotICP };
  };

  /// Called when an in-game action generates a FRNTR fee.
  /// Routes the full `amount` to the developer FRNTR treasury.
  public shared ({ caller }) func notifyFRNTRFee(
    amount : Nat,
    actor_ : Principal,
  ) : async { #ok; #err : TreasuryError } {
    developerTreasuryFRNTR += amount;
    // Also cache the caller's balance for leaderboard
    let prev = switch (playerFrntrBalances.get(actor_)) { case (?v) v; case null 0 };
    playerFrntrBalances.add(actor_, prev + amount);
    logAudit(actor_, amount, "frntFee");
    #ok;
  };

  // ---------------------------------------------------------------------------
  // PUBLIC — Username system
  // ---------------------------------------------------------------------------

  /// Set a unique username for the calling principal.
  public shared ({ caller }) func setUsername(
    username : Text
  ) : async { #ok; #err : TreasuryError } {
    if (not validUsername(username)) { return #err(#InvalidUsername) };
    if (usernameIndex.get(username) != null) { return #err(#UsernameTaken) };
    // Remove old username index entry if the caller already has one
    switch (usernames.get(caller)) {
      case (?old) { usernameIndex.remove(old) };
      case null {};
    };
    usernames.add(caller, username);
    usernameIndex.add(username, caller);
    #ok;
  };

  /// Get the username for a principal, if set.
  public query func getUsername(p : Principal) : async ?Text {
    usernames.get(p);
  };

  /// Check whether a username is already taken.
  public query func usernameExists(username : Text) : async Bool {
    usernameIndex.get(username) != null;
  };

  // ---------------------------------------------------------------------------
  // PUBLIC — Leaderboard
  // ---------------------------------------------------------------------------

  /// Return top `limit` players with usernames, ranked by FRNTR balance.
  /// TODO: replace local balance lookup with real ICRC-1 `balance_of` call
  ///       to `frntLedgerPrincipal` once FRNTR ledger canister is deployed.
  public func getLeaderboard(limit : Nat) : async [LeaderboardEntry] {
    // Collect all principals with usernames and their balances
    let pairs = usernames.toArray();
    let scored = pairs.map<(Principal, Text), LeaderboardEntry>(
      func((p, uname)) {
        let bal = switch (playerFrntrBalances.get(p)) { case (?v) v; case null 0 };
        { rank = 0; principal = p; username = uname; frntrBalance = bal };
      }
    );
    // Sort descending by frntrBalance
    let sorted = scored.sort(
      func(a : LeaderboardEntry, b : LeaderboardEntry) : Order.Order {
        Nat.compare(b.frntrBalance, a.frntrBalance);
      }
    );
    // Assign ranks and limit
    let taken = Nat.min(limit, sorted.size());
    let sliced = sorted.sliceToArray(0, taken);
    var i = 0;
    sliced.mapInPlace(func(e : LeaderboardEntry) : LeaderboardEntry {
      i += 1;
      { e with rank = i };
    });
    sliced;
  };

  // ---------------------------------------------------------------------------
  // PUBLIC QUERIES — Pot balances
  // ---------------------------------------------------------------------------

  /// Developer ICP treasury balance.
  public query func getDeveloperTreasuryICP() : async Nat { developerTreasuryICP };

  /// Developer FRNTR treasury balance.
  public query func getDeveloperTreasuryFRNTR() : async Nat { developerTreasuryFRNTR };

  /// Leaderboard ICP pot balance.
  public query func getLeaderboardPotICP() : async Nat { leaderboardPotICP };

  /// Liquidity ICP pot balance.
  public query func getLiquidityPotICP() : async Nat { liquidityPotICP };

  /// Current cycle balance of this canister.
  public query func getCycleBalance() : async Nat { Cycles.balance() };

  // ---------------------------------------------------------------------------
  // ADMIN — Developer treasury withdrawals
  // ---------------------------------------------------------------------------

  /// Withdraw ICP from developer treasury (admin only).
  /// TODO: wire real ICP ledger transfer to `to` account identifier.
  public shared ({ caller }) func withdrawDeveloperTreasuryICP(
    amount : Nat,
    to : Text,
  ) : async { #ok; #err : TreasuryError } {
    switch (requireAdmin(caller)) {
      case (#err e) { return #err e };
      case (#ok) {};
    };
    if (developerTreasuryICP < amount) { return #err(#InsufficientFunds) };
    developerTreasuryICP -= amount;
    logAudit(caller, amount, "withdrawDevICP:" # to);
    // TODO: await ICPLedger.transfer({ to = ...; amount = amount; ... });
    #ok;
  };

  /// Withdraw FRNTR from developer treasury (admin only).
  /// TODO: wire real ICRC-1 transfer to `to` principal.
  public shared ({ caller }) func withdrawDeveloperTreasuryFRNTR(
    amount : Nat,
    to : Principal,
  ) : async { #ok; #err : TreasuryError } {
    switch (requireAdmin(caller)) {
      case (#err e) { return #err e };
      case (#ok) {};
    };
    if (developerTreasuryFRNTR < amount) { return #err(#InsufficientFunds) };
    developerTreasuryFRNTR -= amount;
    logAudit(caller, amount, "withdrawDevFRNTR:" # to.toText());
    // TODO: await FRNTRLedger.icrc1_transfer({ to = { owner = to; subaccount = null }; amount = amount; ... });
    #ok;
  };

  // ---------------------------------------------------------------------------
  // ADMIN — Leaderboard reward distribution
  // ---------------------------------------------------------------------------

  /// Distribute ICP reward from leaderboard pot to a winner (admin only).
  /// TODO: wire real ICP ledger transfer.
  public shared ({ caller }) func distributeLeaderboardReward(
    amount : Nat,
    to : Principal,
  ) : async { #ok; #err : TreasuryError } {
    switch (requireAdmin(caller)) {
      case (#err e) { return #err e };
      case (#ok) {};
    };
    if (leaderboardPotICP < amount) { return #err(#InsufficientFunds) };
    leaderboardPotICP -= amount;
    logAudit(caller, amount, "leaderboardReward:" # to.toText());
    // TODO: await ICPLedger.transfer(...);
    #ok;
  };

  // ---------------------------------------------------------------------------
  // ADMIN — Fee percentage management
  // ---------------------------------------------------------------------------

  /// Update revenue split percentages. Must sum to exactly 100; each <= 50.
  public shared ({ caller }) func updateFeePercentages(
    dev : Nat,
    lb : Nat,
    liq : Nat,
  ) : async { #ok; #err : TreasuryError } {
    switch (requireAdmin(caller)) {
      case (#err e) { return #err e };
      case (#ok) {};
    };
    if (dev + lb + liq != 100) { return #err(#InvalidPercentages) };
    if (dev > 50 or lb > 50 or liq > 50) { return #err(#InvalidPercentages) };
    devFeePercent         := dev;
    leaderboardFeePercent := lb;
    liquidityFeePercent   := liq;
    logAudit(caller, 0, "updateFees");
    #ok;
  };

  // ---------------------------------------------------------------------------
  // ADMIN — DEX whitelist
  // ---------------------------------------------------------------------------

  /// Add a canister to the approved DEX whitelist for liquidity withdrawals.
  public shared ({ caller }) func addApprovedDEXCanister(
    dexId : Principal
  ) : async { #ok; #err : TreasuryError } {
    switch (requireAdmin(caller)) {
      case (#err e) { return #err e };
      case (#ok) {};
    };
    // Deduplicate
    for (p in approvedDEXCanisters.vals()) {
      if (p == dexId) { return #ok };
    };
    approvedDEXCanisters := Array.concat(approvedDEXCanisters, [dexId]);
    logAudit(caller, 0, "addDEX:" # dexId.toText());
    #ok;
  };

  /// Remove a canister from the approved DEX whitelist.
  public shared ({ caller }) func removeApprovedDEXCanister(
    dexId : Principal
  ) : async { #ok; #err : TreasuryError } {
    switch (requireAdmin(caller)) {
      case (#err e) { return #err e };
      case (#ok) {};
    };
    approvedDEXCanisters := approvedDEXCanisters.filter(func(p : Principal) : Bool { p != dexId });
    logAudit(caller, 0, "removeDEX:" # dexId.toText());
    #ok;
  };

  // ---------------------------------------------------------------------------
  // ADMIN — Liquidity pot withdrawal (DEX-restricted)
  // ---------------------------------------------------------------------------

  /// Withdraw from liquidity pot — only to a pre-approved DEX canister.
  /// TODO: wire real ICP ledger transfer.
  public shared ({ caller }) func withdrawLiquidityPot(
    amount : Nat,
    to : Principal,
  ) : async { #ok; #err : TreasuryError } {
    switch (requireAdmin(caller)) {
      case (#err e) { return #err e };
      case (#ok) {};
    };
    // Strict DEX whitelist check
    var approved = false;
    for (p in approvedDEXCanisters.vals()) {
      if (p == to) { approved := true };
    };
    if (not approved) { return #err(#InvalidDEX) };
    if (liquidityPotICP < amount) { return #err(#InsufficientFunds) };
    liquidityPotICP -= amount;
    logAudit(caller, amount, "withdrawLiq:" # to.toText());
    // TODO: await ICPLedger.transfer(...);
    #ok;
  };

  // ---------------------------------------------------------------------------
  // ADMIN — Principal management
  // ---------------------------------------------------------------------------

  /// Transfer admin control to a new principal.
  public shared ({ caller }) func updateAdminPrincipal(
    newAdmin : Principal
  ) : async { #ok; #err : TreasuryError } {
    switch (requireAdmin(caller)) {
      case (#err e) { return #err e };
      case (#ok) {};
    };
    adminPrincipal := newAdmin;
    logAudit(caller, 0, "updateAdmin:" # newAdmin.toText());
    #ok;
  };

  /// Set the FRNTR ICRC-1 ledger canister principal.
  public shared ({ caller }) func setFRNTLedgerPrincipal(
    p : Principal
  ) : async { #ok; #err : TreasuryError } {
    switch (requireAdmin(caller)) {
      case (#err e) { return #err e };
      case (#ok) {};
    };
    frntLedgerPrincipal := p;
    logAudit(caller, 0, "setFRNTLedger:" # p.toText());
    #ok;
  };

};
