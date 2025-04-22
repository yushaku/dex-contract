// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

contract StorageLayout {
  mapping(address => uint256) balances;

  function setBalance(address _address, uint256 _value) public {
    balances[_address] = _value;
  }

  function getStorageSlot(address _key) public pure returns (bytes32 slot) {
    uint256 balanceMappingSlot;

    assembly {
      // `.slot` returns the state variable (balance)
      // location within the storage slots.
      // In our case, balance.slot = 0
      balanceMappingSlot := balances.slot
    }

    slot = keccak256(abi.encode(_key, balanceMappingSlot));
  }

  function getValue(address _key) public view returns (uint256 value) {
    // CALL HELPER FUNCTION TO GET SLOT
    bytes32 slot = getStorageSlot(_key);

    assembly {
      // Loads the value stored in the slot
      value := sload(slot)
    }
  }
}

contract MyNestedMapping {
  mapping(address => mapping(uint256 => uint256)) public balance;

  constructor(address user, uint256 tokenId, uint256 value) {
    balance[user][tokenId] = value;
  }

  function getStorageSlot(
    address _key1,
    uint256 _key2
  ) public pure returns (bytes32 slot) {
    uint256 balanceMappingSlot;
    assembly {
      // ' "slot' returns the state variable (balance) location within the storage slots.
      // In our cas, 0
      balanceMappingSlot := balance.slot
    }
    // First hash
    bytes32 initialHash = keccak256(abi.encode(_key1, balanceMappingSlot));
    // Second hash
    slot = keccak256(abi.encode(_key2, initialHash));
  }

  function getValue(bytes32 _slot) public view returns (uint256 value) {
    assembly {
      // Loads the value stored in the slot
      value := sload(_slot)
    }
  }

  function getBalance(address user, uint256 tokenId) public view returns (uint256) {
    return balance[user][tokenId];
  }
}

contract MyDynArray {
  uint256 private someNumber; // storage slot 0
  uint32[] private myArr = [3, 4, 5, 9, 7]; // storage slot 2

  function getSlotValue(uint256 _index) public view returns (bytes32 value) {
    uint256 arraySlot;
    assembly {
      arraySlot := myArr.slot
    }

    uint256 _slot = uint256(keccak256(abi.encode(arraySlot))) + _index;
    assembly {
      value := sload(_slot)
    }
  }
}

contract MyNestedArray {
  uint256 private someNumber; // storage slot 0

  // Initialize nested array
  uint256[][] private a = [[2, 9, 6, 3], [7, 4, 8, 10]]; // storage slot 1

  function getSlot(
    uint256 baseSlot,
    uint256 _index1,
    uint256 _index2
  ) public pure returns (bytes32 _finalSlot) {
    // keccak256(baseSlot) + _index1
    uint256 _initialSlot = uint256(keccak256(abi.encode(baseSlot))) + _index1;

    // keccak256(_initialSlot) + _index2
    _finalSlot = bytes32(uint256(keccak256(abi.encode(_initialSlot))) + _index2);
  }

  function getSlotValue(uint256 _slot) public view returns (uint256 value) {
    assembly {
      value := sload(_slot)
    }
  }
}

contract StorageLayout2 {
  uint16 x = 1;
  uint16 y = 2;
  uint16 z = 3;
}

contract StorageString {
  string public shortString = "hello world";
  string public longString = "hello world, greetings from my team and i";

  bytes32 public startingSlotString = keccak256(abi.encode(1));

  function getSlotForString(uint256 _index) public view returns (bytes32) {
    return bytes32(uint256(startingSlotString) + _index);
  }
}
