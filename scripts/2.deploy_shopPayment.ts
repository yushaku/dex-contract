import { ethers, upgrades } from "hardhat";
import { getImplementationAddress } from "@openzeppelin/upgrades-core";
import { getAddress, verifyContract, writeDownAddress } from "./utils/helper";
import { ContractName } from "./utils/config";
import { sleep } from "./utils/sleep";

async function main(step: number) {
  // const [owner] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  let implementationAddress = "0x96008434aee932f739925771a71325c354f0c861";

  if (step <= 1) {
    console.log("Deploying ShopPayment...");
    const ShopPayment = await ethers.getContractFactory("ShopPayment");

    // Deploy the upgradeable contract using a UUPS proxy
    const shopPayment = await upgrades.deployProxy(ShopPayment, [], {
      initializer: "initialize",
    });

    const address = await shopPayment.getAddress();
    console.info({ address });

    implementationAddress = await getImplementationAddress(
      ethers.provider,
      address,
    );
    console.info("Implementation Address:", implementationAddress);

    writeDownAddress(ContractName.ShopPayment, address, network.name);

    await sleep(20_000);
  }

  if (step <= 1.5) {
    const address = getAddress(ContractName.ShopPayment, network.name);
    await verifyContract(address, []);

    await verifyContract(implementationAddress, []);
  }
}

main(1.5)
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
