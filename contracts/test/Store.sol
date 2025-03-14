// SPDX-License-Identifier: MIT

pragma solidity 0.8.20;

contract StorageLayout {
  uint256 x = 1; // slot 0
  uint256 y = 2; // slot 1
  uint256 z = 3; // slot 2
}

contract StorageLayout2 {
  uint16 x = 1;
  uint16 y = 2;
  uint16 z = 3;
}

contract StorageString {
  string public name = "Pacelli";
}

contract StorageLongString {
  string public text =
    "Last month I forgot to pay my mobile phone service and the provider almost cut my service :(, trash trash trash junk junk junk test test test, Today is saturday, is raining a lot and I forgot my umbrella.";

  bytes32 public startingSlotString = keccak256(abi.encode(0));

  function getStartingSlotForString(uint256 _index) public view returns (bytes32) {
    return bytes32(uint256(startingSlotString) + _index);
  }
}
