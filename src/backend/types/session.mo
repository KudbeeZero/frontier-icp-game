// Session / identity display types for Frontier: Missile Horizon.
module {
  // Compact principal display string (first 8 chars + '...' + last 4 chars).
  public type PrincipalDisplay = {
    full       : Text;
    short      : Text;
    isAuthed   : Bool;
  };
};
