// Treasury domain types for Frontier: Missile Horizon.
// Covers plot-sale milestone tracking, payout history, and recipient records.
import CommonTypes "common";

module {
  public type Timestamp = CommonTypes.Timestamp;
  public type PlayerId  = CommonTypes.PlayerId;

  /// A single recipient entry within a payout event.
  public type PayoutRecipient = {
    rank      : Nat;       // 1-based leaderboard rank at payout time
    principal : Principal; // recipient principal
    username  : Text;      // display name at payout time
    amountICP : Nat;       // ICP e8s distributed to this recipient
  };

  /// Immutable record of a completed leaderboard payout.
  public type PayoutEvent = {
    id           : Nat;               // sequential payout ID (1, 2, 3 …)
    timestamp    : Timestamp;         // nanoseconds since epoch
    totalAmount  : Nat;               // total ICP e8s distributed from leaderboard pot
    milestoneAt  : Nat;               // plotsSold value that triggered the payout
    topN         : Nat;               // how many players received a share
    recipients   : [PayoutRecipient]; // ordered by rank ascending
  };

  /// Summary view returned by getPayoutHistory.
  public type PayoutEventView = PayoutEvent;

  /// Flat snapshot returned by getTreasuryState — matches the frontend TreasuryState shape.
  public type TreasuryState = {
    developer       : Nat;  // dev treasury ICP e8s
    leaderboard     : Nat;  // leaderboard pot ICP e8s
    liquidity       : Nat;  // liquidity pot ICP e8s
    totalPlotsSold  : Nat;  // cumulative plots sold
    totalPlayers    : Nat;  // registered players (have a username)
    totalRevenueICP : Nat;  // cumulative ICP e8s received from plot sales
  };

  /// Result variants for seed operations.
  public type SeedResult = { #ok; #err : { #NotAuthorized; #InsufficientFunds } };
};
