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
import Blob "mo:core/Blob";

/// Treasury Canister for Frontier: Missile Horizon
/// Handles 25/25/50 revenue split on plot purchases and FRNTR fee routing.
actor {

  // ---------------------------------------------------------------------------
  // ICRC-1 transfer types (for ICP ledger calls)
  // ---------------------------------------------------------------------------
  type ICRC1Account = { owner : Principal; subaccount : ?Blob };

  type ICRC1TransferArgs = {
    to               : ICRC1Account;
    amount           : Nat;
    fee              : ?Nat;
    memo             : ?Blob;
    from_subaccount  : ?Blob;
    created_at_time  : ?Nat64;
  };

  type ICRC1TransferError = {
    #BadFee              : { expected_fee : Nat };
    #BadBurn             : { min_burn_amount : Nat };
    #InsufficientFunds   : { balance : Nat };
    #TooOld;
    #CreatedInFuture     : { ledger_time : Nat64 };
    #Duplicate           : { duplicate_of : Nat };
    #TemporarilyUnavailable;
    #GenericError        : { error_code : Nat; message : Text };
  };

  type ICRC1TransferResult = { #Ok : Nat; #Err : ICRC1TransferError };

  let ICP_LEDGER_ID : Text = "ryjl3-tyaaa-aaaaa-aaaba-cai";

  /// Build a 32-byte subaccount blob where byte 31 = index.
  /// index 1 = dev, 2 = leaderboard, 3 = liquidity
  private func subaccountOf(index : Nat8) : Blob {
    let bytes : [Nat8] = Array.tabulate<Nat8>(32, func(i) { if (i == 31) { index } else { 0 } });
    Blob.fromArray(bytes);
  };

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
  /// FRNTR accumulated from in-game upgrade liquidity tax (0.075% of each upgrade cost)
  var liquidityFRNTRPot : Nat = 0;

  // ---------------------------------------------------------------------------
  // Stable fee percentages (must always sum to 100)
  // ---------------------------------------------------------------------------
  var devFeePercent : Nat = 25;
  var leaderboardFeePercent : Nat = 25;
  var liquidityFeePercent : Nat = 50;

  // ---------------------------------------------------------------------------
  // Admin principal
  // ---------------------------------------------------------------------------
  var adminPrincipal : Principal = Principal.fromText("cjdkt-wqjqk-jd6xu-uc2jl-lgueg-v4kum-o32mf-mwl7v-63yjp-26gyk-mae");

  // ---------------------------------------------------------------------------
  // FRNTR ledger principal — set via setFrntrLedgerPrincipal after deployment
  // ---------------------------------------------------------------------------
  var frntrLedger : ?Principal = null;

  // ---------------------------------------------------------------------------
  // Approved DEX canisters for liquidity pot withdrawals
  // ---------------------------------------------------------------------------
  var approvedDEXCanisters : [Principal] = [];
  /// Single approved liquidity canister for withdrawLiquidityPot (ICPSwap).
  var approvedLiquidityCanister : ?Principal = null;

  // ---------------------------------------------------------------------------
  // Username registry — persisted via enhanced orthogonal persistence
  // ---------------------------------------------------------------------------
  /// Maps Principal → username
  let usernames = Map.empty<Principal, Text>();
  /// Reverse map for uniqueness checks: username → Principal
  let usernameIndex = Map.empty<Text, Principal>();

  // ---------------------------------------------------------------------------
  // Pending treasury transfers — filled when any icrc1_transfer in notifyPlotPurchase
  // returns #Err. Admin can drain via retryPendingTransfers().
  // Each entry: (subaccountIndex: Nat8, amount: Nat, timestamp: Int)
  // ---------------------------------------------------------------------------
  stable var pendingTreasuryTransfers : [(Nat8, Nat, Int)] = [];

  // ---------------------------------------------------------------------------
  // Treasury canister's own principal — used as `to.owner` for subaccount transfers.
  // Set once after deployment by calling setSelfPrincipal(), or via admin override.
  // ---------------------------------------------------------------------------
  stable var selfPrincipalText : Text = "aaaaa-aa";
  public shared ({ caller }) func setSelfPrincipal() : async () {
    if (selfPrincipalText == "aaaaa-aa") {
      selfPrincipalText := caller.toText();
    };
  };
  public shared ({ caller }) func setTreasurySelfPrincipal(p : Text) : async { #ok; #err : TreasuryError } {
    switch (requireAdmin(caller)) {
      case (#err e) { return #err e };
      case (#ok) {};
    };
    selfPrincipalText := p;
    #ok;
  };
  public query func getTreasurySelfPrincipal() : async Text { selfPrincipalText };

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
  /// Splits `amount` using precise Nat arithmetic and routes each portion
  /// to its designated subaccount via real ICP ICRC-1 transfers.
  ///   dev_gross = amount * 25 / 100
  ///   lb_gross  = amount * 25 / 100
  ///   liq_gross = amount - dev_gross - lb_gross  (absorbs rounding remainder)
  /// Each transfer pays a 10_000 e8s fee; net amounts deduct the fee.
  public shared ({ caller }) func notifyPlotPurchase(
    amount : Nat,
    buyer : Principal,
  ) : async { #ok; #err : TreasuryError } {
    let fee : Nat = 10_000;
    let dev_gross = amount * 25 / 100;
    let lb_gross  = amount * 25 / 100;
    let liq_gross = amount - dev_gross - lb_gross;

    // Ensure amounts cover the transfer fee before attempting
    if (dev_gross < fee or lb_gross < fee or liq_gross < fee) {
      // Amount too small to split with fees — fall back to counter-only tracking
      developerTreasuryICP += dev_gross;
      leaderboardPotICP    += lb_gross;
      liquidityPotICP      += liq_gross;
      logAudit(buyer, amount, "plotPurchase:counterOnly:tooSmall");
      return #ok;
    };

    let dev_net = dev_gross - fee;
    let lb_net  = lb_gross  - fee;
    let liq_net = liq_gross - fee;

    let icpLedger = actor(ICP_LEDGER_ID) : actor {
      icrc1_transfer : (ICRC1TransferArgs) -> async ICRC1TransferResult
    };

    // Transfer to dev subaccount (index 1)
    let devResult = await icpLedger.icrc1_transfer({
      to              = { owner = Principal.fromText(selfPrincipalText); subaccount = ?(subaccountOf(1)) };
      amount          = dev_net;
      fee             = ?fee;
      memo            = null;
      from_subaccount = null;
      created_at_time = null;
    });
    switch (devResult) {
      case (#Err(_)) {
        let ts = Time.now();
        pendingTreasuryTransfers := Array.concat(pendingTreasuryTransfers, [(1 : Nat8, dev_gross, ts)]);
      };
      case (#Ok(_))  {};
    };

    // Transfer to leaderboard subaccount (index 2)
    let lbResult = await icpLedger.icrc1_transfer({
      to              = { owner = Principal.fromText(selfPrincipalText); subaccount = ?(subaccountOf(2)) };
      amount          = lb_net;
      fee             = ?fee;
      memo            = null;
      from_subaccount = null;
      created_at_time = null;
    });
    switch (lbResult) {
      case (#Err(_)) {
        let ts = Time.now();
        pendingTreasuryTransfers := Array.concat(pendingTreasuryTransfers, [(2 : Nat8, lb_gross, ts)]);
      };
      case (#Ok(_))  {};
    };

    // Transfer to liquidity subaccount (index 3)
    let liqResult = await icpLedger.icrc1_transfer({
      to              = { owner = Principal.fromText(selfPrincipalText); subaccount = ?(subaccountOf(3)) };
      amount          = liq_net;
      fee             = ?fee;
      memo            = null;
      from_subaccount = null;
      created_at_time = null;
    });
    switch (liqResult) {
      case (#Err(_)) {
        let ts = Time.now();
        pendingTreasuryTransfers := Array.concat(pendingTreasuryTransfers, [(3 : Nat8, liq_gross, ts)]);
      };
      case (#Ok(_))  {};
    };

    // Update running totals (gross amounts — reflect total routed to each pot)
    developerTreasuryICP += dev_gross;
    leaderboardPotICP    += lb_gross;
    liquidityPotICP      += liq_gross;

    logAudit(buyer, amount, "plotPurchase:dev=" # Nat.toText(dev_gross) # ":lb=" # Nat.toText(lb_gross) # ":liq=" # Nat.toText(liq_gross));
    #ok;
  };

  // ---------------------------------------------------------------------------
  // ADMIN — Retry failed treasury transfers
  // ---------------------------------------------------------------------------

  /// Retry any treasury transfers that failed during notifyPlotPurchase.
  /// Loops pendingTreasuryTransfers, attempts each transfer, removes successful ones.
  /// Returns the count of successful retries.
  /// Admin only.
  public shared ({ caller }) func retryPendingTransfers() : async { #ok : Nat; #err : TreasuryError } {
    switch (requireAdmin(caller)) {
      case (#err e) { return #err e };
      case (#ok) {};
    };
    if (pendingTreasuryTransfers.size() == 0) { return #ok(0) };

    let icpLedger = actor(ICP_LEDGER_ID) : actor {
      icrc1_transfer : (ICRC1TransferArgs) -> async ICRC1TransferResult
    };
    let fee : Nat = 10_000;
    var successCount : Nat = 0;
    var remaining : [(Nat8, Nat, Int)] = [];

    for ((subIdx, gross, ts) in pendingTreasuryTransfers.vals()) {
      if (gross < fee) {
        // Amount too small to retry — drop it silently
      } else {
        let net = gross - fee;
        let result = await icpLedger.icrc1_transfer({
          to              = { owner = Principal.fromText(selfPrincipalText); subaccount = ?(subaccountOf(subIdx)) };
          amount          = net;
          fee             = ?fee;
          memo            = null;
          from_subaccount = null;
          created_at_time = null;
        });
        switch (result) {
          case (#Ok(_))  { successCount += 1 };
          case (#Err(_)) { remaining := Array.concat(remaining, [(subIdx, gross, ts)]) };
        };
      };
    };

    pendingTreasuryTransfers := remaining;
    logAudit(caller, successCount, "retryPendingTransfers:success=" # Nat.toText(successCount));
    #ok(successCount);
  };

  /// Returns pending transfers that have not yet been successfully retried.
  /// Admin only.
  public shared query ({ caller }) func getPendingTransfers() : async { #ok : [(Nat8, Nat, Int)]; #err : TreasuryError } {
    switch (requireAdmin(caller)) {
      case (#err e) { return #err e };
      case (#ok) {};
    };
    #ok(pendingTreasuryTransfers);
  };

  /// Consolidated query returning all three pot balances at once.
  /// Calls icrc1_balance_of on ICP ledger for each subaccount (dev=1, leaderboard=2, liquidity=3).
  public func getPotBalances() : async {
    developerTreasuryICP   : Nat;
    developerTreasuryFRNTR : Nat;
    leaderboardPotICP      : Nat;
    liquidityPotICP        : Nat;
    liquidityFRNTRPot      : Nat;
  } {
    type ICRC1BalanceAccount = { owner : Principal; subaccount : ?Blob };
    let icpLedger = actor(ICP_LEDGER_ID) : actor {
      icrc1_balance_of : (ICRC1BalanceAccount) -> async Nat
    };
    let self = Principal.fromText(selfPrincipalText);
    let devBal  = await icpLedger.icrc1_balance_of({ owner = self; subaccount = ?(subaccountOf(1)) });
    let lbBal   = await icpLedger.icrc1_balance_of({ owner = self; subaccount = ?(subaccountOf(2)) });
    let liqBal  = await icpLedger.icrc1_balance_of({ owner = self; subaccount = ?(subaccountOf(3)) });
    {
      developerTreasuryICP   = devBal;
      developerTreasuryFRNTR = developerTreasuryFRNTR;
      leaderboardPotICP      = lbBal;
      liquidityPotICP        = liqBal;
      liquidityFRNTRPot      = liquidityFRNTRPot;
    };
  };

  /// Called when an in-game action generates a FRNTR fee.
  /// Routes the amount to the FRNTR liquidity pot (0.075% upgrade tax).
  public shared ({ caller }) func notifyFRNTRFee(
    amount : Nat,
    actor_ : Principal,
  ) : async { #ok; #err : TreasuryError } {
    // Route FRNTR fee to liquidity pot (earmarked for FRNTR/ICP DEX seeding)
    liquidityFRNTRPot += amount;
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
    // Collect all principals with usernames
    let pairs = usernames.toArray();
    // For each principal, fetch balance from ICRC-1 ledger if set, else local cache
    var scored : [LeaderboardEntry] = [];
    for ((p, uname) in pairs.vals()) {
      let bal : Nat = switch (frntrLedger) {
        case (?ledgerId) {
          let tokenActor = actor(ledgerId.toText()) : actor {
            icrc1_balance_of : ({ owner : Principal; subaccount : ?Blob }) -> async Nat
          };
          await tokenActor.icrc1_balance_of({ owner = p; subaccount = null });
        };
        case (null) {
          switch (playerFrntrBalances.get(p)) { case (?v) v; case null 0 };
        };
      };
      scored := Array.concat(scored, [{ rank = 0; principal = p; username = uname; frntrBalance = bal }]);
    };
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


  // ---------------------------------------------------------------------------
  // PUBLIC — Comprehensive treasury summary for the UNIVERSE panel
  // ---------------------------------------------------------------------------

  /// Returns a comprehensive treasury summary computed from live canister state.
  /// Queries ICP ledger subaccounts directly for live pot balances.
  /// totalFRNTRBurned is tracked in the game canister; this returns the cached
  /// value supplied by the last notifyFRNTRFee call.
  public func getTreasurySummary() : async {
    totalICPInTreasury       : Nat;  // sum of all three pot balances (e8s)
    devPotBalance            : Nat;  // developer pot (e8s)
    leaderboardPotBalance    : Nat;  // leaderboard prize pot (e8s)
    liquidityPotBalance      : Nat;  // DEX liquidity pot (e8s)
    totalPlotsSold           : Nat;  // plots sold since genesis (from internal counter)
    totalFRNTRBurned         : Nat;  // cumulative FRNTR e8s burned (tracked via notifyFRNTRFee)
    currentMilestone         : Nat;  // milestone index (plotsSold / 1500)
    nextMilestoneThreshold   : Nat;  // plot count at the next milestone
    milestoneProgressPercent : Nat;  // percent progress toward next milestone (0-100)
  } {
    type ICRC1BalanceAccount = { owner : Principal; subaccount : ?Blob };
    let icpLedgerQ = actor(ICP_LEDGER_ID) : actor {
      icrc1_balance_of : (ICRC1BalanceAccount) -> async Nat
    };
    let self = Principal.fromText(selfPrincipalText);
    let devBal  = await icpLedgerQ.icrc1_balance_of({ owner = self; subaccount = ?(subaccountOf(1)) });
    let lbBal   = await icpLedgerQ.icrc1_balance_of({ owner = self; subaccount = ?(subaccountOf(2)) });
    let liqBal  = await icpLedgerQ.icrc1_balance_of({ owner = self; subaccount = ?(subaccountOf(3)) });

    let total   = devBal + lbBal + liqBal;
    // Mirror plotsSold from internal counter (updated by notifyPlotPurchase)
    let sold    = developerTreasuryICP + leaderboardPotICP; // plots * avg price proxy isn’t reliable;
                                                             // use the actual sold counter from game canister.
    // Use pot counters to derive approximate sold count only when no better source is available
    // Primary: maintained by notifyPlotPurchase incrementing the counters.
    // milestones every 1500 plots
    let milestone      = (developerTreasuryICP / 50_000_000) / 1500; // approximate from dev pot
    let nextThreshold  = (milestone + 1) * 1500;
    let inThisMile     = (developerTreasuryICP / 50_000_000) - (milestone * 1500);
    let progressPct    = if (inThisMile >= 1500) { 100 } else { inThisMile * 100 / 1500 };

    {
      totalICPInTreasury       = total;
      devPotBalance            = devBal;
      leaderboardPotBalance    = lbBal;
      liquidityPotBalance      = liqBal;
      totalPlotsSold           = developerTreasuryICP / 50_000_000; // rough; game canister is authoritative
      totalFRNTRBurned         = liquidityFRNTRPot;  // cumulative FRNTR fees received
      currentMilestone         = milestone;
      nextMilestoneThreshold   = nextThreshold;
      milestoneProgressPercent = progressPct;
    };
  };

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

  /// Withdraw from liquidity pot — only to the single pre-approved liquidity canister.
  /// Returns #err(#InvalidDEX) with message "Unauthorized recipient canister" if
  /// `to` does not match the approvedLiquidityCanister.
  public shared ({ caller }) func withdrawLiquidityPot(
    amount : Nat,
    to : Principal,
  ) : async { #ok; #err : TreasuryError } {
    switch (requireAdmin(caller)) {
      case (#err e) { return #err e };
      case (#ok) {};
    };
    // Single approved liquidity canister check
    switch (approvedLiquidityCanister) {
      case (null) { return #err(#InvalidDEX) };
      case (?approved) {
        if (approved != to) { return #err(#InvalidDEX) };
      };
    };
    if (liquidityPotICP < amount) { return #err(#InsufficientFunds) };
    liquidityPotICP -= amount;
    logAudit(caller, amount, "withdrawLiq:" # to.toText());
    // TODO: await ICPLedger.transfer(...);
    #ok;
  };

  /// Set the single pre-approved ICPSwap canister address for liquidity pot withdrawals (admin only).
  public shared ({ caller }) func setApprovedLiquidityCanister(
    canisterId : Principal
  ) : async { #ok; #err : TreasuryError } {
    switch (requireAdmin(caller)) {
      case (#err e) { return #err e };
      case (#ok) {};
    };
    approvedLiquidityCanister := ?canisterId;
    logAudit(caller, 0, "setApprovedLiquidityCanister:" # canisterId.toText());
    #ok;
  };

  /// Returns the currently approved liquidity canister principal, or null if not set.
  public query func getApprovedLiquidityCanister() : async ?Principal {
    approvedLiquidityCanister;
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

  /// Set the FRNTR ICRC-1 ledger canister principal (admin only).
  public shared ({ caller }) func setFrntrLedgerPrincipal(
    p : Principal
  ) : async { #ok; #err : TreasuryError } {
    switch (requireAdmin(caller)) {
      case (#err e) { return #err e };
      case (#ok) {};
    };
    frntrLedger := ?p;
    logAudit(caller, 0, "setFrntrLedger:" # p.toText());
    #ok;
  };

};
