import Map "mo:core/Map";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Order "mo:core/Order";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Nat "mo:core/Nat";



actor {
  public type RecordState = {
    name : Text;
    ippon : Nat;
    wazaari : Nat;
    yuko : Nat;
    senshu : Bool;
    isWinner : Bool;
    warnings : [Warning];
  };

  public type Warning = {
    foul : FoulType;
    issuedBy : Nat;
    crowdReaction : Nat;
  };

  public type FoulType = {
    #c1;
    #c2;
    #c3;
    #hansoku;
    #hansokumake;
  };

  public type RecordMatch = {
    ao : RecordState;
    aka : RecordState;
    category : Text;
    tatamiNumber : Text;
    timestamp : Time.Time;
    winner : Text;
    totalTime : Text;
    matchNumber : Nat;
  };

  module RecordMatch {
    public func compare(a : RecordMatch, b : RecordMatch) : Order.Order {
      Nat.compare(a.matchNumber, b.matchNumber);
    };
  };

  var matchNumber = 0;
  stable let currentTatami = "1";
  stable let defaultTimeMinutes = 3;
  stable let defaultTimeSeconds = 0;

  stable var matchStoreEntries : [(Nat, RecordMatch)] = [];
  let matchStore = Map.empty<Nat, RecordMatch>();

  public shared ({ caller }) func saveMatch(newMatch : RecordMatch) : async () {
    matchStore.add(newMatch.matchNumber, newMatch);
  };

  public shared ({ caller }) func newMatch(params : { aoName : Text; akaName : Text; category : Text; tatamiNumber : Text }) : async RecordMatch {
    matchNumber += 1;
    {
      ao = {
        name = params.aoName;
        wazaari = 0;
        yuko = 0;
        ippon = 0;
        senshu = false;
        isWinner = false;
        warnings = [];
      };
      aka = {
        name = params.akaName;
        wazaari = 0;
        yuko = 0;
        ippon = 0;
        senshu = false;
        isWinner = false;
        warnings = [];
      };
      category = params.category;
      tatamiNumber = params.tatamiNumber;
      totalTime = "N/A";
      winner = "";
      timestamp = 0;
      matchNumber = matchNumber;
    };
  };

  public shared ({ caller }) func updateSettings(newTatami : ?Text, newMinutes : ?Nat, newSeconds : ?Nat) : async () {
    ignore newTatami;
    ignore newMinutes;
    ignore newSeconds;
  };

  public query ({ caller }) func getDefaultSettings() : async { tatamiNumber : Text; minutes : Nat; seconds : Nat } {
    {
      tatamiNumber = currentTatami;
      minutes = defaultTimeMinutes;
      seconds = defaultTimeSeconds;
    };
  };

  public query ({ caller }) func getMatch(matchId : Nat) : async RecordMatch {
    switch (matchStore.get(matchId)) {
      case (null) { Runtime.trap("Could not find requested match: " # matchId.toText()) };
      case (?match) { match };
    };
  };

  public query ({ caller }) func getAllMatches() : async [RecordMatch] {
    matchStore.values().toArray().sort();
  };

  system func preupgrade() {
    matchStoreEntries := matchStore.toArray();
  };

  system func postupgrade() {
    matchStoreEntries := [];
  };
};
