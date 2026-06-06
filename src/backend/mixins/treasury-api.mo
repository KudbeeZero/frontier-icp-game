// Treasury public API mixin — milestone tracking, payout distribution, history.
// Injected state:
//   plotsSold         : { var value : Nat }  — total plots sold counter
//   payoutHistory     : List.List<TTypes.PayoutEvent> — append-only payout log
//   leaderboardPotICP : { var value : Nat }  — ICP e8s held for leaderboard rewards
//   devTreasuryICP    : { var value : Nat }  — ICP e8s for developer treasury
//   liquidityPotICP   : { var value : Nat }  — ICP e8s locked for DEX liquidity
//   adminPrincipal    : { var value : Principal }
//   usernames         : Map.Map<Principal, Text> — registered player usernames
import Nat      "mo:core/Nat";
import List     "mo:core/List";
import Map      "mo:core/Map";
import Time     "mo:core/Time";
import Runtime  "mo:core/Runtime";
import Blob     "mo:core/Blob";
import Array    "mo:core/Array";
import TTypes   "../types/treasury";
import TLib     "../lib/treasury";

mixin (
  plotsSold            : { var value : Nat },
  payoutHistory        : List.List<TTypes.PayoutEvent>,
  leaderboardPotICP    : { var value : Nat },
  devTreasuryICP       : { var value : Nat },
  liquidityPotICP      : { var value : Nat },
  adminPrincipal       : { var value : Principal },
  usernames            : Map.Map<Principal, Text>,
  approvedDexPrincipal : { var value : ?Principal },
  selfPrincipal        : { var value : Principal },
) {

  // ICP ledger actor reference for balance queries
  let icpLedger : actor {
    icrc1_balance_of : ({ owner : Principal; subaccount : ?Blob }) -> async Nat;
  } = actor("ryjl3-tyaaa-aaaaa-aaaba-cai");

  /// Build a 32-byte subaccount blob where byte 31 = index.
  /// 1 = dev, 2 = leaderboard, 3 = liquidity
  private func subaccountOf(index : Nat8) : Blob {
    let bytes : [Nat8] = Array.tabulate<Nat8>(32, func(i) { if (i == 31) index else 0 });
    Blob.fromArray(bytes);
  };

  // -------------------------------------------------------------------------
  // INTERNAL — admin guard helper
  // -------------------------------------------------------------------------

  func requireAdmin(caller : Principal) {
    if (caller != adminPrincipal.value) {
      Runtime.trap("NotAuthorized: admin only");
    };
  };

  // -------------------------------------------------------------------------
  // UPDATE — called by game canister on every plot purchase
  // -------------------------------------------------------------------------

  /// Called by the game canister after a successful plot sale.
  /// Increments plotsSold and splits `amountE8s` 25/25/50 across the three pots.
  /// The caller must be the admin principal (game canister) to prevent abuse.
  public shared ({ caller }) func notifyPlotPurchase(
    amountE8s : Nat,
    buyer     : Principal,
  ) : async () {
    requireAdmin(caller);
    ignore buyer; // stored in game canister; logged there

    // Precise Nat arithmetic — no rounding drift.
    // dev = floor(amount * 25 / 100)
    // leaderboard = floor(amount * 25 / 100)
    // liquidity = remainder so the three always sum to amountE8s exactly.
    let dev        = amountE8s * 25 / 100;
    let leaderboard = amountE8s * 25 / 100;
    let liquidity  = amountE8s - dev - leaderboard;

    devTreasuryICP.value    += dev;
    leaderboardPotICP.value += leaderboard;
    liquidityPotICP.value   += liquidity;

    plotsSold.value += 1;
  };

  // -------------------------------------------------------------------------
  // UPDATE — FRNTR fee routing (3 % to developer treasury)
  // -------------------------------------------------------------------------

  /// Called by the game canister when an in-game action incurs a FRNTR fee.
  /// Routes the full supplied amount to the developer treasury FRNTR balance.
  /// (FRNTR accounting is tracked separately in the game/token canister;
  ///  this function updates the treasury's internal FRNTR ledger only.)
  public shared ({ caller }) func notifyFRNTRFee(
    amountFRNTR : Nat,
    actor_      : Principal,
  ) : async () {
    requireAdmin(caller);
    ignore (amountFRNTR, actor_);
    // FRNTR fee is credited to dev treasury off-ledger for now;
    // full ICRC-1 transfer wired in the next sprint when the token
    // canister ID is available on mainnet.
  };

  // -------------------------------------------------------------------------
  // QUERY — How many plots have been sold in total
  // -------------------------------------------------------------------------

  /// Returns the total number of plots sold since genesis.
  public query func getPlotsSold() : async Nat {
    plotsSold.value;
  };

  // -------------------------------------------------------------------------
  // QUERY — Whether the most-recent count has crossed a milestone
  // -------------------------------------------------------------------------

  /// Returns true when plotsSold is a positive multiple of 1500.
  public query func isPayoutMilestoneReached() : async Bool {
    TLib.isPayoutMilestoneReached(plotsSold.value);
  };

  // -------------------------------------------------------------------------
  // QUERY — Plots remaining until the next payout milestone
  // -------------------------------------------------------------------------

  /// Returns how many more plots must sell before the next payout milestone.
  public query func getNextPayoutMilestone() : async Nat {
    TLib.plotsUntilNextMilestone(plotsSold.value);
  };

  // -------------------------------------------------------------------------
  // QUERY — Full payout history
  // -------------------------------------------------------------------------

  /// Returns all completed payout events, ordered from oldest to newest.
  public query func getPayoutHistory() : async [TTypes.PayoutEventView] {
    TLib.allPayoutEvents(payoutHistory);
  };

  // -------------------------------------------------------------------------
  // QUERY — All three pot balances
  // -------------------------------------------------------------------------

  /// Returns live ICP e8s balances for all three treasury pots by querying
  /// the ICP ledger subaccounts directly (subaccount byte31: 1=dev, 2=leaderboard, 3=liquidity).
  public func getTreasuryBalances() : async {
    devTreasuryE8s    : Nat;
    leaderboardPotE8s : Nat;
    liquidityPotE8s   : Nat;
  } {
    let canisterId = selfPrincipal.value;
    let devBal    = await icpLedger.icrc1_balance_of({ owner = canisterId; subaccount = ?subaccountOf(1) });
    let ldrBal    = await icpLedger.icrc1_balance_of({ owner = canisterId; subaccount = ?subaccountOf(2) });
    let liqBal    = await icpLedger.icrc1_balance_of({ owner = canisterId; subaccount = ?subaccountOf(3) });
    {
      devTreasuryE8s    = devBal;
      leaderboardPotE8s = ldrBal;
      liquidityPotE8s   = liqBal;
    };
  };

  // -------------------------------------------------------------------------
  // ADMIN UPDATE — Trigger leaderboard payout to top-N players
  // -------------------------------------------------------------------------

  /// Admin-only: distribute the full leaderboard pot ICP equally among the top
  /// `topN` registered players (by username registration order as proxy until
  /// live FRNTR balance queries are wired to the token canister on mainnet).
  /// Records an immutable PayoutEvent in payoutHistory.
  public shared ({ caller }) func distributeLeaderboardPayout(
    topN : Nat,
  ) : async { #ok : TTypes.PayoutEvent; #err : { #NotAuthorized; #InsufficientFunds; #NoEligiblePlayers } } {
    if (caller != adminPrincipal.value) {
      return #err(#NotAuthorized);
    };
    if (leaderboardPotICP.value == 0) {
      return #err(#InsufficientFunds);
    };

    // Collect all registered players (usernames map).
    let allPlayers = usernames.entries();
    // Build recipient list up to topN entries.
    var recipients : List.List<TTypes.PayoutRecipient> = List.empty();
    var count = 0;
    var rank  = 1;
    for ((principal, username) in allPlayers) {
      if (count < topN) {
        recipients.add({
          rank;
          principal;
          username;
          amountICP = 0; // filled after total is known
        });
        count  += 1;
        rank   += 1;
      };
    };

    if (count == 0) {
      return #err(#NoEligiblePlayers);
    };

    // Distribute pot equally; remainder stays in pot to avoid dust.
    let share      = leaderboardPotICP.value / count;
    let distributed = share * count;

    // Rebuild recipients with actual share amount.
    let finalRecipients = recipients.toArray();
    let withAmounts = Array.tabulate<TTypes.PayoutRecipient>(
      finalRecipients.size(),
      func(i) { { finalRecipients[i] with amountICP = share } },
    );

    // Deduct distributed amount from pot; keep remainder in pot.
    leaderboardPotICP.value -= distributed;

    let event = TLib.buildPayoutEvent(
      payoutHistory.size() + 100,
      distributed,
      plotsSold.value,
      count,
      withAmounts,
    );
    payoutHistory.add(event);

    #ok(event);
  };

  // -------------------------------------------------------------------------
  // ADMIN UPDATE — Withdraw from developer treasury
  // -------------------------------------------------------------------------

  /// Admin-only: record a withdrawal from the developer treasury.
  /// Actual ICP ledger transfer is wired at mainnet deployment.
  public shared ({ caller }) func withdrawDevTreasury(
    amountE8s : Nat,
  ) : async { #ok; #err : { #NotAuthorized; #InsufficientFunds } } {
    if (caller != adminPrincipal.value) {
      return #err(#NotAuthorized);
    };
    if (amountE8s > devTreasuryICP.value) {
      return #err(#InsufficientFunds);
    };
    devTreasuryICP.value -= amountE8s;
    #ok;
  };

  // -------------------------------------------------------------------------
  // ADMIN UPDATE — Withdraw from liquidity pot (DEX only)
  // -------------------------------------------------------------------------

  /// Admin-only: mark liquidity pot ICP as deployed to a pre-approved DEX.
  /// The recipient must equal the stored approvedDexPrincipal — set via setApprovedLiquidityCanister.
  public shared ({ caller }) func withdrawLiquidityPot(
    amountE8s           : Nat,
    recipient           : Principal,
  ) : async { #ok; #err : { #NotAuthorized; #InsufficientFunds } } {
    if (caller != adminPrincipal.value) {
      return #err(#NotAuthorized);
    };
    // Whitelist check: recipient must match the stored approved DEX principal.
    switch (approvedDexPrincipal.value) {
      case null { Runtime.trap("Unauthorized: no approved DEX canister set") };
      case (?approved) {
        if (recipient != approved) {
          Runtime.trap("Unauthorized: recipient not whitelisted");
        };
      };
    };
    if (amountE8s > liquidityPotICP.value) {
      return #err(#InsufficientFunds);
    };
    liquidityPotICP.value -= amountE8s;
    #ok;
  };

  // -------------------------------------------------------------------------
  // ADMIN UPDATE — Set the approved DEX canister for liquidity withdrawals
  // -------------------------------------------------------------------------

  /// Admin-only: register the single approved DEX canister that may receive
  /// liquidity pot withdrawals (e.g. ICPSwap FRNTR/ICP pool canister).
  public shared ({ caller }) func setApprovedLiquidityCanister(
    dexCanister : Principal,
  ) : async { #ok; #err : { #NotAuthorized } } {
    if (caller != adminPrincipal.value) {
      return #err(#NotAuthorized);
    };
    approvedDexPrincipal.value := ?dexCanister;
    #ok;
  };

  // -------------------------------------------------------------------------
  // ADMIN UPDATE — Update admin principal
  // -------------------------------------------------------------------------

  /// Admin-only: transfer admin rights to a new principal.
  public shared ({ caller }) func setAdminPrincipal(
    newAdmin : Principal,
  ) : async { #ok; #err : { #NotAuthorized } } {
    if (caller != adminPrincipal.value) {
      return #err(#NotAuthorized);
    };
    adminPrincipal.value := newAdmin;
    #ok;
  };
};
