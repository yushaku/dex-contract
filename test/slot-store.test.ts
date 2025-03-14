import { expect } from "chai";
import { BigNumberish, toBigInt } from "ethers";
import { ethers } from "hardhat";

let contractAddress: string;

describe("SLOT STORE TEST", () => {
  beforeEach(async () => {});

  describe("--- STORAGE LAYOUT FOR VALUE TYPE ---", async () => {});

  describe("--- STORAGE LAYOUT FOR ARRAY ---", async () => {});

  describe("--- STORAGE LAYOUT FOR MAPPING ---", async () => {});

  describe("--- STORAGE LAYOUT FOR STRING AND BYTE ---", async () => {
    it("should read short string", async () => {
      const Contract = await ethers.getContractFactory("StorageString");
      const contract = await Contract.deploy();
      contractAddress = await contract.getAddress();

      const hexData =
        "0x506163656c6c690000000000000000000000000000000000000000000000000e";

      expect(await readHex(0)).equal(hexData);
      expect(await readString(0)).equal("Pacelli");
      const length = hexToDecimal(`0x${hexData.slice(-2)}`);
      expect(length).equal(14);
      expect("506163656c6c69".length).eq(14);
    });

    it("should read long string", async () => {
      const Contract = await ethers.getContractFactory("StorageLongString");
      const contract = await Contract.deploy();
      contractAddress = await contract.getAddress();

      // expect(await read(1)).equal(
      //   18569430475105882587588266137607568536673111973893317399460219858819262702947n,
      // );
      expect(await readHex(1)).equal(
        "0x290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563",
      );
    });
  });

  describe("--- STORAGE LAYOUT FOR STRUCT ---", async () => {});
});

async function readHex(slot: BigNumberish): Promise<string> {
  return ethers.provider.getStorage(contractAddress, BigInt(slot));
}

async function readString(slot: BigNumberish): Promise<string> {
  const contentPointer = await readHex(slot);
  let hexString = contentPointer.slice(2); // Remove the "0x" part
  hexString = hexString.slice(0, 62); // Remove the "1a" part
  hexString = hexString.replace(/00+$/, "");
  const bytes = ethers.getBytes(`0x${hexString}`);
  let content = ethers.toUtf8String(bytes);
  return content;
}

async function read(slot: BigNumberish): Promise<BigInt> {
  return BigInt(await readHex(BigInt(slot)));
}

function hexToDecimal(hex: string) {
  return toBigInt(hex);
}
