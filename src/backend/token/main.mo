/// FRNTR ICRC-1 Token Canister
/// Standard ICRC-1 implementation for the Frontier: Missile Horizon token.
/// Name: Frontier  Symbol: FRNTR  Decimals: 8
/// Max supply: 10_000_000_000 FRNTR = 1_000_000_000_000_000_000 raw (8 decimals)
/// Fixed transfer fee: 10_000 raw = 0.0001 FRNTR
///
/// Init: minting_account is set at deploy time.
/// The full PRE_MINTED supply (5B FRNTR = 500_000_000_000_000_000 raw) is
/// credited to the game canister's account in initial_balances.
/// The minting_account (admin) may call setMintingAccount once post-deploy.
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Nat "mo:core/Nat";
import Array "mo:core/Array";
import Blob "mo:core/Blob";
import Text "mo:core/Text";
import Iter "mo:core/Iter";
import Int "mo:core/Int";
import Option "mo:core/Option";
import Runtime "mo:core/Runtime";

actor class FrntrToken(
  init_minting_account  : Account,
  init_initial_balances : [(Account, Nat)],
  init_token_name       : Text,
  init_token_symbol     : Text,
  init_decimals         : Nat8,
  init_max_supply       : Nat,
) {

  // ---------------------------------------------------------------------------
  // Public types (re-exported for inter-canister callers)
  // ---------------------------------------------------------------------------

  /// ICRC-1 Account — owner + optional 32-byte subaccount.
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

  /// Standard descriptor for icrc1_supported_standards.
  public type Standard = {
    name : Text;
    url  : Text;
  };

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  let FIXED_FEE    : Nat  = 10_000;
  let TOKEN_NAME   : Text = init_token_name;
  let TOKEN_SYMBOL : Text = init_token_symbol;
  let DECIMALS     : Nat8 = init_decimals;
  let MAX_SUPPLY   : Nat  = init_max_supply;

  // ---------------------------------------------------------------------------
  // Stable state
  // ---------------------------------------------------------------------------

  /// Minting account (admin-settable once post-deploy).
  stable var mintingAccount : Account = init_minting_account;
  /// Whether setMintingAccount has been called (one-time only).
  stable var mintingAccountLocked : Bool = false;
  /// Running transfer index (block height).
  stable var nextTxIndex : Nat = 0;
  /// Total minted so far (for total_supply).
  stable var totalMinted : Nat = 0;
  /// Total burned so far.
  stable var totalBurned : Nat = 0;
  /// Balances stable backing array.
  stable var stableBalances : [(Text, Nat)] = [];

  // ---------------------------------------------------------------------------
  // Heap state
  // ---------------------------------------------------------------------------

  /// Primary balance map.  Key is canonicalKey(account).
  let balances = Map.fromIter<Text, Nat>(stableBalances.vals());

  // Seed initial balances on first init (stableBalances is empty on fresh deploy)
  if (stableBalances.size() == 0) {
    for ((acct, amount) in init_initial_balances.vals()) {
      let key = accountKey(acct);
      let existing = Option.get(balances.get(key), 0);
      balances.add(key, existing + amount);
      totalMinted += amount;
    };
  };

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /// Canonical string key for an Account.
  func accountKey(acct : Account) : Text {
    let subStr = switch (acct.subaccount) {
      case (null) { "" };
      case (?blob) { debug_show(blob) };
    };
    acct.owner.toText() # "|" # subStr;
  };

  /// Lookup balance for an account (0 if absent).
  func balanceOf_(acct : Account) : Nat {
    switch (balances.get(accountKey(acct))) {
      case (?bal) { bal };
      case (null)  { 0 };
    };
  };

  /// Credit an account by amount.
  func credit(acct : Account, amount : Nat) {
    let key = accountKey(acct);
    let prev = switch (balances.get(key)) { case (?v) v; case null 0 };
    balances.add(key, prev + amount);
  };

  /// Debit an account by amount.  Traps if insufficient balance.
  func debit(acct : Account, amount : Nat) {
    let key = accountKey(acct);
    let prev = switch (balances.get(key)) { case (?v) v; case null 0 };
    if (prev < amount) { Runtime.trap("Insufficient balance") };
    balances.add(key, prev - amount);
  };

  // ---------------------------------------------------------------------------
  // Upgrade hooks
  // ---------------------------------------------------------------------------

  system func preupgrade() {
    stableBalances := balances.toArray();
  };

  system func postupgrade() {
    stableBalances := [];
  };

  // ---------------------------------------------------------------------------
  // Admin: one-time minting account override
  // ---------------------------------------------------------------------------

  /// Called by the initial minting account to permanently redirect the
  /// minting authority to the deployed game canister after its ID is known.
  /// Can only be called once.
  public shared ({ caller }) func setMintingAccount(newAccount : Account) : async () {
    if (mintingAccountLocked) { Runtime.trap("Minting account already locked") };
    if (caller != mintingAccount.owner) {
      Runtime.trap("Unauthorized: only current minting account owner may call this");
    };
    mintingAccount := newAccount;
    mintingAccountLocked := true;
  };

  // ---------------------------------------------------------------------------
  // ICRC-1 standard queries
  // ---------------------------------------------------------------------------

  public query func icrc1_name() : async Text {
    TOKEN_NAME;
  };

  public query func icrc1_symbol() : async Text {
    TOKEN_SYMBOL;
  };

  public query func icrc1_decimals() : async Nat8 {
    DECIMALS;
  };

  public query func icrc1_fee() : async Nat {
    FIXED_FEE;
  };

  public query func icrc1_total_supply() : async Nat {
    totalMinted - totalBurned;
  };

  public query func icrc1_minting_account() : async ?Account {
    ?mintingAccount;
  };

  public query func icrc1_balance_of(acct : Account) : async Nat {
    balanceOf_(acct);
  };

  public query func icrc1_metadata() : async [(Text, Value)] {
    [
      ("icrc1:name",     #Text(TOKEN_NAME)),
      ("icrc1:symbol",   #Text(TOKEN_SYMBOL)),
      ("icrc1:decimals", #Nat(DECIMALS.toNat())),
      ("icrc1:fee",      #Nat(FIXED_FEE)),
    ];
  };

  public query func icrc1_supported_standards() : async [Standard] {
    [{ name = "ICRC-1"; url = "https://github.com/dfinity/ICRC-1" }];
  };

  // ---------------------------------------------------------------------------
  // ICRC-1 transfer (update call)
  // ---------------------------------------------------------------------------

  public shared ({ caller }) func icrc1_transfer(arg : TransferArg) : async TransferResult {
    // Determine effective fee: use provided fee or default FIXED_FEE
    let effectiveFee = switch (arg.fee) {
      case (?f) { f };
      case (null) { FIXED_FEE };
    };
    // Reject if fee doesn't match expected
    if (effectiveFee != FIXED_FEE) {
      return #Err(#BadFee { expected_fee = FIXED_FEE });
    };
    let fromAccount : Account = { owner = caller; subaccount = arg.from_subaccount };
    let totalRequired = arg.amount + effectiveFee;
    let senderBal = balanceOf_(fromAccount);
    if (senderBal < totalRequired) {
      return #Err(#InsufficientFunds { balance = senderBal });
    };
    // Mint: sender is the minting account — no debit needed, just credit recipient
    let isMint = fromAccount.owner == mintingAccount.owner and
                 fromAccount.subaccount == mintingAccount.subaccount;
    if (isMint) {
      // Minting: check max supply
      let currentSupply = totalMinted - totalBurned;
      if (currentSupply + arg.amount > MAX_SUPPLY) {
        return #Err(#GenericError { error_code = 1; message = "Exceeds max supply" });
      };
      credit(arg.to, arg.amount);
      totalMinted += arg.amount;
    } else {
      // Burn: recipient is the minting account
      let isBurn = arg.to.owner == mintingAccount.owner and
                   arg.to.subaccount == mintingAccount.subaccount;
      if (isBurn) {
        debit(fromAccount, arg.amount);
        totalBurned += arg.amount;
      } else {
        // Normal transfer: debit sender (amount + fee), credit recipient, burn fee
        debit(fromAccount, totalRequired);
        credit(arg.to, arg.amount);
        totalBurned += effectiveFee;
      };
    };
    let txIndex = nextTxIndex;
    nextTxIndex += 1;
    #Ok(txIndex);
  };
}
