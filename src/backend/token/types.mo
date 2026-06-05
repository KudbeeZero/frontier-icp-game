/// Shared ICRC-1 types for the FRNTR token canister.
/// Import these from the backend when making inter-canister calls to the token canister.
module {

  /// ICRC-1 Account.
  public type Account = {
    owner      : Principal;
    subaccount : ?Blob;
  };

  /// Arguments for icrc1_transfer.
  public type TransferArg = {
    from_subaccount : ?Blob;
    to              : Account;
    amount          : Nat;
    fee             : ?Nat;
    memo            : ?Blob;
    created_at_time : ?Nat64;
  };

  /// Result from icrc1_transfer.
  public type TransferResult = {
    #Ok  : Nat;
    #Err : TransferError;
  };

  /// ICRC-1 TransferError variants.
  public type TransferError = {
    #BadFee              : { expected_fee : Nat };
    #BadBurn             : { min_burn_amount : Nat };
    #InsufficientFunds   : { balance : Nat };
    #TooOld;
    #CreatedInFuture     : { ledger_time : Nat64 };
    #Duplicate           : { duplicate_of : Nat };
    #TemporarilyUnavailable;
    #GenericError        : { error_code : Nat; message : Text };
  };

  /// Metadata value variant.
  public type Value = {
    #Nat   : Nat;
    #Int   : Int;
    #Text  : Text;
    #Blob  : Blob;
  };

  /// Standard descriptor.
  public type Standard = {
    name : Text;
    url  : Text;
  };
}
