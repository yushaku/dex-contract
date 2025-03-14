import { ethers, upgrades } from "hardhat";
import { ContractName } from "./utils/config";
import { getAddress } from "./utils/helper";

async function main() {
  const [owner] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  console.log("Deployer:", owner.address);

  const ShopPaymentV2 = await ethers.getContractFactory("ShopPaymentV2");
  const address = getAddress(ContractName.ShopPayment, network.name);
  console.log(`Upgrading ${address} ShopPayment to ShopPaymentV2...`);

  const proxy = await upgrades.upgradeProxy(address, ShopPaymentV2);
  await proxy.waitForDeployment();

  const newAddress = await upgrades.erc1967.getImplementationAddress(address);
  console.log("ShopPayment has new implementation: ", newAddress);

  // Initialize the new version (e.g., set initial discount rate to 1%)
  // const tx = await shopPaymentV2.initializeV2(100); // 100 basis points = 1%
  // await tx.wait();
  //
  // console.log(
  //   "Initialized ShopPaymentV2 with discountRate =",
  //   await shopPaymentV2.discountRate(),
  // );
  //
  // // Optionally verify the new implementation on Etherscan
  // await sleep(20_000); // Wait for Etherscan to index the new contract
  // await verifyContract(address);
}

// Execute the main function
main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
