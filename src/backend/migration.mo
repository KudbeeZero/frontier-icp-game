import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  // --- Old types (from previous version) ---
  type OldDefenses = {
    turrets : Nat;
    shields : Nat;
    walls : Nat;
  };

  type OldFacilities = {
    electricityPlant : Bool;
    blockchainNode : Bool;
    dataCentre : Bool;
    aiLab : Bool;
  };

  type OldPlotState = {
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
    defenses : OldDefenses;
    facilities : OldFacilities;
    attackCooldown : Int;
    faction : ?Text;
    morale : Nat;
    interceptorSystem : ?Text;
    purchaseTimestamp : ?Int;
    nexusElectricityLevel : Nat;
  };

  type OldPlayerState = {
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
    totalFRNTRBurned : Float;
    passiveIncomePerDay : Float;
  };

  type OldCombatEvent = {
    timestamp : Int;
    attacker : Principal;
    fromPlot : Nat;
    toPlot : Nat;
    success : Bool;
    atkPower : Nat;
    defPower : Nat;
    intercepted : Bool;
    interceptorType : ?Text;
    missileType : ?Text;
  };

  type OldLeaderEntry = {
    principal : Principal;
    plotsOwned : Nat;
    frntEarned : Nat;
    combatVictories : Nat;
  };

  // --- New types (matching current main.mo) ---
  type NewDefenses = {
    turrets : Nat;
    shields : Nat;
    walls : Nat;
  };

  type NewFacilities = {
    electricityPlant : Bool;
    blockchainNode : Bool;
    dataCentre : Bool;
    aiLab : Bool;
  };

  type NewPlotState = {
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
    defenses : NewDefenses;
    facilities : NewFacilities;
    attackCooldown : Int;
    faction : ?Text;
    morale : Nat;
    interceptorSystem : ?Text;
    purchaseTimestamp : ?Int;
    nexusElectricityLevel : Nat;
  };

  type NewPlayerState = {
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
    totalFRNTRBurned : Float;
    passiveIncomePerDay : Float;
  };

  type NewCombatEvent = {
    timestamp : Int;
    attacker : Principal;
    fromPlot : Nat;
    toPlot : Nat;
    success : Bool;
    atkPower : Nat;
    defPower : Nat;
    intercepted : Bool;
    interceptorType : ?Text;
    missileType : ?Text;
  };

  type NewLeaderEntry = {
    principal : Principal;
    plotsOwned : Nat;
    frntEarned : Nat;
    combatVictories : Nat;
  };

  // --- Old and new actor shapes ---
  type OldActor = {
    plots : Map.Map<Nat, OldPlotState>;
    players : Map.Map<Principal, OldPlayerState>;
    combatLog : Map.Map<Int, OldCombatEvent>;
    leaderboard : Map.Map<Principal, OldLeaderEntry>;
    interceptors : Map.Map<Nat, Text>;
  };

  type NewActor = {
    plots : Map.Map<Nat, NewPlotState>;
    players : Map.Map<Principal, NewPlayerState>;
    combatLog : Map.Map<Int, NewCombatEvent>;
    leaderboard : Map.Map<Principal, NewLeaderEntry>;
    interceptors : Map.Map<Nat, Text>;
  };

  public func run(old : OldActor) : NewActor {
    let newPlots = old.plots.map<Nat, OldPlotState, NewPlotState>(
      func(_id, p) { p }
    );

    let newPlayers = old.players.map<Principal, OldPlayerState, NewPlayerState>(
      func(_id, p) { p }
    );

    {
      plots = newPlots;
      players = newPlayers;
      combatLog = old.combatLog;
      leaderboard = old.leaderboard;
      interceptors = old.interceptors;
    };
  };
};
