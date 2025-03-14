import { ethers, upgrades } from "hardhat";
import { getAddress, verifyContract, writeDownAddress } from "./utils/helper";
import { ContractName } from "./utils/config";
import { sleep } from "./utils/sleep";

async function main(step: number) {
  const [owner] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  if (step <= 1) {
    console.log(`deployer ${owner.address}`);
    console.log("Deploying ShopPayment...");

    // Deploy the upgradeable contract using a UUPS proxy
    const ShopPayment = await ethers.getContractFactory("ShopPayment");
    const shopPayment = await upgrades.deployProxy(ShopPayment, [], {
      initializer: "initialize",
      kind: "uups",
    });

    const address = await shopPayment.getAddress();
    writeDownAddress(ContractName.ShopPayment, address, network.name);

    await sleep(20_000);
  }

  if (step <= 1.5) {
    const proxy = getAddress(ContractName.ShopPayment, network.name);
    const implement = await upgrades.erc1967.getImplementationAddress(proxy);
    console.info("Implementation Address:", implement);

    await verifyContract(proxy, []);
    await verifyContract(implement, []);
  }
}

main(1.5)
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
