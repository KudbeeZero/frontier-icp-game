// Treasury domain logic for plot-sale milestone tracking and payout history.
import Nat     "mo:core/Nat";
import List    "mo:core/List";
import Map     "mo:core/Map";
import Time    "mo:core/Time";
import Types   "../types/treasury";

module {
  // ---------------------------------------------------------------------------
  // Milestone constants
  // ---------------------------------------------------------------------------

  /// Leaderboard payout fires every MILESTONE_INTERVAL plots sold.
  public let MILESTONE_INTERVAL : Nat = 1500;

  // ---------------------------------------------------------------------------
  // Milestone queries (pure functions — no state needed)
  // ---------------------------------------------------------------------------

  /// Returns true when plotsSold is a positive multiple of MILESTONE_INTERVAL.
  public func isPayoutMilestoneReached(plotsSold : Nat) : Bool {
    plotsSold > 0 and plotsSold % MILESTONE_INTERVAL == 0;
  };

  /// How many more plots must sell before the next payout milestone fires.
  public func plotsUntilNextMilestone(plotsSold : Nat) : Nat {
    let remainder = plotsSold % MILESTONE_INTERVAL;
    if (remainder == 0 and plotsSold > 0) {
      // Just hit a milestone; next one is a full interval away.
      MILESTONE_INTERVAL
    } else {
      MILESTONE_INTERVAL - remainder
    };
  };

  // ---------------------------------------------------------------------------
  // Payout event helpers
  // ---------------------------------------------------------------------------

  /// Build a PayoutEvent record from the supplied fields.
  public func buildPayoutEvent(
    id          : Nat,
    totalAmount : Nat,
    milestoneAt : Nat,
    topN        : Nat,
    recipients  : [Types.PayoutRecipient],
  ) : Types.PayoutEvent {
    {
      id;
      timestamp   = Time.now();
      totalAmount;
      milestoneAt;
      topN;
      recipients;
    };
  };

  /// Return all payout events as an immutable array (most-recent last).
  public func allPayoutEvents(
    history : List.List<Types.PayoutEvent>
  ) : [Types.PayoutEventView] {
    history.toArray();
  };

  /// Build the flat TreasuryState snapshot from mutable state refs.
  public func buildTreasuryState(
    devE8s          : Nat,
    leaderboardE8s  : Nat,
    liquidityE8s    : Nat,
    plotsSoldVal    : Nat,
    totalRevenueVal : Nat,
    usernamesMap    : Map.Map<Principal, Text>,
  ) : Types.TreasuryState {
    {
      developer       = devE8s;
      leaderboard     = leaderboardE8s;
      liquidity       = liquidityE8s;
      totalPlotsSold  = plotsSoldVal;
      totalPlayers    = usernamesMap.size();
      totalRevenueICP = totalRevenueVal;
    };
  };
};
