// migration.mo — No-op pass-through migration for Frontier: Missile Horizon.
//
// The previously deployed actor already has `lastClaimTime : Int` in PlayerState.
// Types are already compatible — this is a pass-through migration.
import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  type PlayerState = {
    iron                : Nat;
    fuel                : Nat;
    crystal             : Nat;
    frntBalance         : Nat;
    icpBalance          : Nat;
    plotsOwned          : Nat;
    combatVictories     : Nat;
    commanderType       : ?Text;
    commanderAtk        : Nat;
    commanderDef        : Nat;
    satelliteExpiry     : Int;
    reconTargets        : [(Nat, Int)];
    empTargets          : [(Nat, Int)];
    totalFRNTRBurned    : Float;
    passiveIncomePerDay : Float;
    lastClaimTime       : Int;
  };

  type OldActor = {
    stablePlayers : [(Principal, PlayerState)];
    players       : Map.Map<Principal, PlayerState>;
  };
  type NewActor = {
    stablePlayers : [(Principal, PlayerState)];
    players       : Map.Map<Principal, PlayerState>;
  };

  public func run(old : OldActor) : NewActor {
    { stablePlayers = old.stablePlayers; players = old.players };
  };
};
