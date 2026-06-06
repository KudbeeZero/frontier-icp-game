// migration.mo — Explicit upgrade migration for Frontier: Missile Horizon.
//
// Adds lastClaimTime : Int (default 0) to every PlayerState entry stored in
// the `stablePlayers` stable array (deployed without that field).
import Map "mo:core/Map";

module {
  // ── Old types (inline — do NOT import from .old/) ──────────────────────────

  type OldPlayerState = {
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
    // lastClaimTime is intentionally ABSENT in the old version
  };

  // ── New types (must match the current actor's PlayerState exactly) ─────────

  type NewPlayerState = {
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
    lastClaimTime       : Int;   // NEW field — defaults to 0 for existing players
  };

  // ── Actor state shapes ──────────────────────────────────────────────────────
  //
  // OldActor: targets `stablePlayers` (the stable array backing the players map)
  // as it existed in the previously deployed actor, with OldPlayerState entries.
  //
  // NewActor: same field with NewPlayerState entries (lastClaimTime added).
  // All other stable fields are not listed — they are compatible without migration.

  type OldActor = {
    stablePlayers : [(Principal, OldPlayerState)];
    players       : Map.Map<Principal, OldPlayerState>;
  };
  type NewActor = {
    stablePlayers : [(Principal, NewPlayerState)];
    players       : Map.Map<Principal, NewPlayerState>;
  };

  // ── Migration function ──────────────────────────────────────────────────────
  //
  // Maps each (Principal, OldPlayerState) pair to (Principal, NewPlayerState)
  // by adding lastClaimTime = 0 via record spread.

  public func run(old : OldActor) : NewActor {
    // Migrate the stable array backing
    let newStablePlayers : [(Principal, NewPlayerState)] =
      old.stablePlayers.map<(Principal, OldPlayerState), (Principal, NewPlayerState)>(
        func((p, ps)) {
          (p, { ps with lastClaimTime = 0 : Int })
        }
      );
    // Migrate the heap Map directly
    let newPlayers = old.players.map<Principal, OldPlayerState, NewPlayerState>(
      func(_p, ps) { { ps with lastClaimTime = 0 : Int } }
    );
    {
      stablePlayers = newStablePlayers;
      players       = newPlayers;
    };
  };
};
