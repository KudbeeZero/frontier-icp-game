// Session / identity helper functions for Frontier: Missile Horizon.
import Text "mo:core/Text";
import Types "../types/session";

module {
  /// Build a PrincipalDisplay record from a Principal.
  public func display(principal : Principal) : Types.PrincipalDisplay {
    let full = principal.toText();
    let short = shorten(full, 8, 4);
    let isAuthed = not principal.isAnonymous();
    { full; short; isAuthed };
  };

  /// Shorten a principal text to "XXXX...XXXX" format.
  public func shorten(text : Text, prefixLen : Nat, suffixLen : Nat) : Text {
    let len = text.size();
    if (len <= prefixLen + suffixLen + 3) { return text };
    var prefix = "";
    var i = 0;
    for (c in text.chars()) {
      if (i < prefixLen) {
        prefix := prefix # Text.fromChar(c);
        i += 1;
      };
    };
    var suffix = "";
    var j = 0;
    for (c in text.chars()) {
      if (j >= len - suffixLen) {
        suffix := suffix # Text.fromChar(c);
      };
      j += 1;
    };
    prefix # "..." # suffix;
  };
};
