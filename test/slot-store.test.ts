import { expect } from "chai";
import {
  BigNumberish,
  Signer,
  concat,
  keccak256,
  toBeHex,
  toBigInt,
  zeroPadValue,
} from "ethers";
import { ethers } from "hardhat";
import { toWei } from "./helper";

let contractAddress: string;

describe("SLOT STORE TEST", () => {
  let user: Signer;
  let creator: Signer;
  let buyer: Signer;

  beforeEach(async () => {
    [user, creator, buyer] = await ethers.getSigners();
  });

  it("--- STORAGE LAYOUT FOR MAPPING ---", async () => {
    const Contract = await ethers.getContractFactory("StorageLayout");
    const contract = await Contract.deploy();
    contractAddress = await contract.getAddress();

    // Set mapping value
    const valueToSet = toWei(123);
    const userAddress = await user.getAddress();
    await contract.setBalance(userAddress, valueToSet);

    // Mapping is at slot 3
    const mappingSlot = 0;

    // Compute storage slot of balances[owner.address]
    // zeroPadValue => thành chuỗi hex đủ 32 bytes
    const key = zeroPadValue(userAddress, 32);
    const slot = zeroPadValue(toBeHex(mappingSlot), 32);

    const storageSlot = keccak256(concat([key, slot]));

    // read raw storage value
    const rawValue = await ethers.provider.getStorage(
      contractAddress,
      storageSlot,
    );

    const storedValue = toBigInt(rawValue);
    expect(storedValue).to.equal(valueToSet);

    const slotOfOwnerBalance = await contract.getStorageSlot(userAddress);
    const valueOfOwnerBalance = await contract.getValue(userAddress);

    expect(slotOfOwnerBalance).to.equal(storageSlot);
    expect(valueOfOwnerBalance).to.equal(valueToSet);

    console.log("Storage slot:", storageSlot);
    console.log("Stored value:", storedValue.toString());
  });

  it("--- STORAGE LAYOUT FOR NESTED MAPPING ---", async () => {
    const userAddress = await user.getAddress();
    const tokenId = 1;
    const value = 1;

    const Contract = await ethers.getContractFactory("MyNestedMapping");
    const contract = await Contract.deploy(userAddress, tokenId, value);
    const contractAddress = await contract.getAddress();

    // Set mapping value
    const mappingSlot = 0;

    // Compute storage slot of balances[owner.address]
    // zeroPadValue => thành chuỗi hex đủ 32 bytes
    const key1 = zeroPadValue(userAddress, 32);
    const key2 = zeroPadValue(toBeHex(tokenId), 32);
    const slot = zeroPadValue(toBeHex(mappingSlot), 32);

    const initHash = keccak256(concat([key1, slot]));
    const storageSlot = keccak256(concat([key2, initHash]));

    // read raw storage value
    const rawValue = await ethers.provider.getStorage(
      contractAddress,
      storageSlot,
    );

    const storedValue = toBigInt(rawValue);
    expect(storedValue).to.equal(value);

    const slotOfOwnerBalance = await contract.getStorageSlot(
      userAddress,
      tokenId,
    );
    const valueOfOwnerBalance = await contract.getValue(slotOfOwnerBalance);

    expect(valueOfOwnerBalance).to.equal(value);
    expect(slotOfOwnerBalance).to.equal(storageSlot);
  });

  it("--- STORAGE LAYOUT FOR DYNAMIC ARRAY ---", async () => {
    const Contract = await ethers.getContractFactory("MyDynArray");
    const contract = await Contract.deploy();
    const contractAddress = await contract.getAddress();

    const slotIndex = 1; // slot base of myArr
    const slotKey = zeroPadValue(toBeHex(slotIndex), 32);

    // 🔢 1. Lấy độ dài mảng từ slot 0
    const rawLength = await ethers.provider.getStorage(
      contractAddress,
      slotIndex,
    );

    expect(rawLength).to.equal(5n);

    // // 🔢 2. compute slot of the first element: keccak256(slotIndex)
    // const baseSlot = keccak256(slotKey); // slot of data[0]
    // const baseSlotBigInt = toBigInt(baseSlot);
    //
    // // 🔍 3. get value the first and second element
    // const element0 = await ethers.provider.getStorage(
    //   contractAddress,
    //   baseSlotBigInt + 0n,
    // );
    // const element1 = await ethers.provider.getStorage(
    //   contractAddress,
    //   baseSlotBigInt + 1n,
    // );
    const element2 = await contract.getSlotValue(0n);

    // console.log("data[0]:", toBigInt(element0).toString()); // 3
    // console.log("data[1]:", toBigInt(element1).toString()); // 4
    console.log("data[2]:", element2.toString()); // 5
    // 0x0000000000000000000000000000000700000009000000050000000400000003

    // expect(toBigInt(element0)).to.equal(3n);
    // expect(toBigInt(element1)).to.equal(4n);
    // expect(toBigInt(element2)).to.equal(5n);
  });

  describe("--- STORAGE LAYOUT FOR MAPPING ---", async () => {});

  describe.skip("--- STORAGE LAYOUT FOR STRING AND BYTE ---", async () => {
    it("should read short string", async () => {
      const Contract = await ethers.getContractFactory("StorageString");
      const contract = await Contract.deploy();
      contractAddress = await contract.getAddress();

      // hello world
      const hexData =
        "0x68656c6c6f20776f726c64000000000000000000000000000000000000000016";

      expect(await getStorage(0)).equal(hexData);

      expect(await readString(0)).equal("hello world");
      const length = hexToDecimal(`0x${hexData.slice(-2)}`);
      expect(length).equal(22);
    });

    it("should read long string", async () => {
      const Contract = await ethers.getContractFactory("StorageString");
      const contract = await Contract.deploy();
      contractAddress = await contract.getAddress();

      const baseSlot = 1;
      // length of string
      expect(await getStorage(baseSlot)).equal(
        "0x0000000000000000000000000000000000000000000000000000000000000053",
      );

      // Step 3: Read the string data from that offset
      const parts: string[] = [];

      for (let i = 0n; i < 2n; i++) {
        const slot = await contract.getSlotForString(i);
        const value = await getStorage(slot);
        parts.push(value.replace(/^0x/, ""));
      }

      // Step 4: Combine and decode
      const joined = parts.join("");
      const buffer = Buffer.from(joined, "hex");
      const str = buffer.toString("utf8").replace(/\0+$/, "");

      expect(str).to.equal("hello world, greetings from my team and i");
    });
  });

  describe.skip("--- STORAGE LAYOUT FOR STRUCT ---", async () => {});
});

async function getStorage(slot: BigNumberish): Promise<string> {
  return ethers.provider.getStorage(contractAddress, BigInt(slot));
}

async function readString(slot: BigNumberish): Promise<string> {
  const contentPointer = await getStorage(slot);
  let hexString = contentPointer.slice(2); // Remove the "0x" part
  hexString = hexString.slice(0, 62); // Remove the "1a" part
  hexString = hexString.replace(/00+$/, "");
  const bytes = ethers.getBytes(`0x${hexString}`);
  let content = ethers.toUtf8String(bytes);
  return content;
}

async function read(slot: BigNumberish): Promise<BigInt> {
  return BigInt(await getStorage(BigInt(slot)));
}

function hexToDecimal(hex: string) {
  return toBigInt(hex);
}
