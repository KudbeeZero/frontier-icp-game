import Principal "mo:core/Principal";
import Nat "mo:core/Nat";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Int "mo:core/Int";
import Order "mo:core/Order";
import Float "mo:core/Float";

actor {
  type Defenses = {
    turrets : Nat;
    shields : Nat;
    walls : Nat;
  };

  type Facilities = {
    electricityPlant : Bool;
    blockchainNode : Bool;
    dataCentre : Bool;
    aiLab : Bool;
  };

  type PlotState = {
    plotId : Nat;
    biome : Text;
    richness : Nat;
    lat : Float;
    lng : Float;
    owner : ?Principal;
    nftTokenId : ?Nat;
    iron : Nat;
    fuel : Nat;
    crystal : Nat;
    lastTick : Int;
    defenses : Defenses;
    facilities : Facilities;
    attackCooldown : Int;
    faction : ?Text;
    morale : Nat;
  };

  type PlayerState = {
    iron : Nat;
    fuel : Nat;
    crystal : Nat;
    frntBalance : Nat;
    plotsOwned : Nat;
    combatVictories : Nat;
    commanderType : ?Text;
    commanderAtk : Nat;
    commanderDef : Nat;
    satelliteExpiry : Int;
    reconTargets : [(Nat, Int)];
    empTargets : [(Nat, Int)];
  };

  type CombatEvent = {
    timestamp : Int;
    attacker : Principal;
    fromPlot : Nat;
    toPlot : Nat;
    success : Bool;
    atkPower : Nat;
    defPower : Nat;
  };

  type LeaderEntry = {
    principal : Principal;
    plotsOwned : Nat;
    frntEarned : Nat;
    combatVictories : Nat;
  };

  type OrbitalEvent = {
    eventType : Text;
    startTime : Int;
    duration : Int;
    affectedBiomes : [Text];
  };

  module LeaderEntry {
    public func compareByFrntEarned(a : LeaderEntry, b : LeaderEntry) : Order.Order {
      Nat.compare(b.frntEarned, a.frntEarned);
    };
  };

  let plots = Map.empty<Nat, PlotState>();
  let players = Map.empty<Principal, PlayerState>();
  let combatLog = Map.empty<Int, CombatEvent>();

  let leaderboard = Map.empty<Principal, LeaderEntry>();

  public shared ({ caller }) func purchasePlot(plotId : Nat) : async { #ok : Text; #err : Text } {
    if (caller.isAnonymous()) {
      return #err("Anonymous users cannot purchase plots");
    };

    // Check if plot exists
    let plot = switch (plots.get(plotId)) {
      case (null) { return #err("Plot does not exist!") };
      case (?plot) { plot };
    };

    switch (plot.owner) {
      case (?owner) {
        if (owner == caller) { return #err("You already own this plot!") };
        return #err("Plot already owned!");
      };
      case (null) {};
    };

    // Check if plot is unclaimed by a faction
    switch (plot.faction) {
      case (?faction) {
        if (faction == "NEXUS-7" or faction == "KRONOS" or faction == "VANGUARD" or faction == "SPECTRE") {
          return #err("Plot is claimed by a faction!");
        };
      };
      case (null) {};
    };

    let player = switch (players.get(caller)) {
      case (null) { emptyPlayerState() };
      case (?player) { player };
    };

    if (player.frntBalance < 100) { return #err("You don't have enough FRNTR!") };

    let updatedPlayer : PlayerState = {
      player with
      frntBalance = player.frntBalance - 100;
      plotsOwned = player.plotsOwned + 1;
    };
    players.add(caller, updatedPlayer);

    let updatedPlot : PlotState = {
      plot with
      owner = ?caller;
    };
    plots.add(plotId, updatedPlot);

    #ok("Purchase successful!");
  };

  func emptyPlayerState() : PlayerState {
    {
      iron = 0;
      fuel = 0;
      crystal = 0;
      frntBalance = 0;
      plotsOwned = 0;
      combatVictories = 0;
      commanderType = null;
      commanderAtk = 0;
      commanderDef = 0;
      satelliteExpiry = 0;
      reconTargets = [];
      empTargets = [];
    };
  };

  func clamp(value : Float, min : Float, max : Float) : Float {
    if (value < min) { return min };
    if (value > max) { return max };
    value;
  };

  func latDistance(x1 : Float, x2 : Float) : Float {
    let diff : Float = x1 - x2;
    let normalizedDiff : Float = clamp(diff, -90.0, 90.0);
    normalizedDiff;
  };

  public query ({ caller }) func getAdjacentPlots(plotId : Nat) : async [Nat] {
    let plot = if (plotId >= 100) { return [] } else {
      switch (plots.get(plotId)) {
        case (null) { return [] };
        case (?plot) { plot };
      };
    };

    let iterator = plots.keys();
    let resultArray : [Nat] = iterator.toArray().sort().filter(
      func(id) {
        let nextPlot = switch (plots.get(id)) {
          case (null) { return false };
          case (?plot) { plot };
        };
        id != plotId and (Float.abs(latDistance(plot.lat, nextPlot.lat) * 1.5) <= 15.0);
      }
    );
    resultArray.sliceToArray(0, Float.min(6.0, resultArray.size().toFloat()).toInt());
  };
};
