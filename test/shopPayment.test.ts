import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { parseEther } from "ethers";
import { ethers, upgrades } from "hardhat";
import { ZERO_ADDRESS } from "../scripts/utils/config";
import { ShopPayment, ShopPaymentV2, YSK, YSK__factory } from "../typechain";

const timeTraver = (seconds: number | bigint) =>
  ethers.provider.send("evm_increaseTime", [seconds]);

const increaseBlock = async (blocks: number) => {
  const total = blocks / 1000;

  for (let i = 0; i < total; i++) {
    await ethers.provider.send("hardhat_mine", [`0x${(1000).toString(16)}`]); // Mines 1000 blocks
  }
};

enum Status {
  PAID,
  DELIVERED,
  CANCELLED,
}

describe("Shop payment gate way", function () {
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let user3: HardhatEthersSigner;
  let user4: HardhatEthersSigner;

  let yuToken: YSK;
  let yuTokenAddress: string;

  let shopPayment: ShopPayment;
  let paymentAddress: string;

  beforeEach(async () => {
    [owner, user1, user2, user3, user4] = await ethers.getSigners();

    yuToken = await new YSK__factory(owner).deploy();
    yuTokenAddress = await yuToken.getAddress();
    expect(yuTokenAddress).not.eq(null, "Deploy YSK is failed.");

    const ShopPayment = await ethers.getContractFactory("ShopPayment");

    shopPayment = (await upgrades.deployProxy(ShopPayment, [], {
      initializer: "initialize",
      kind: "uups",
    })) as unknown as ShopPayment;

    paymentAddress = await shopPayment.getAddress();
  });

  describe("--- PAYABLE TOKEN ---", () => {
    it("should add YSK as payable token", async () => {
      await shopPayment.connect(owner).addPayableToken(yuTokenAddress);
      expect(await shopPayment.payableToken(yuTokenAddress)).to.be.true;
    });

    it("should remove YSK as payable token", async () => {
      await shopPayment.connect(owner).disableToken(yuTokenAddress);
      expect(await shopPayment.payableToken(yuTokenAddress)).to.be.false;
    });
  });

  describe("--- PAY ORDER WITH ETH ---", () => {
    it("should pay order", async () => {
      const orderId = "89b068c4-3ffd-4a16-902b-b3ded45c151b";

      const tx = await shopPayment
        .connect(user1)
        .createAndPayOrder(orderId, parseEther("1"), ZERO_ADDRESS, {
          value: parseEther("1"),
        });

      await expect(tx).to.emit(shopPayment, "OrderPaid");
      await expect(tx).changeEtherBalance(user1.address, -parseEther("1"));

      const order = await shopPayment.orders(orderId);

      expect(order[0]).to.eq(orderId);
      expect(order[1]).to.eq(user1.address);
      expect(order[2]).to.eq(parseEther("1"));
      expect(order[3]).to.eq(Status.PAID);
      expect(order[5]).to.eq(ZERO_ADDRESS);
    });

    it("cancel paid order", async () => {
      const orderId = "89b068c4-3ffd-4a16-902b-b3ded45c151b";

      await shopPayment
        .connect(user1)
        .createAndPayOrder(orderId, parseEther("1"), ZERO_ADDRESS, {
          value: parseEther("1"),
        });

      const tx = await shopPayment.connect(user1).cancelOrder(orderId);
      await expect(tx).to.emit(shopPayment, "OrderCancelled");
      await expect(tx).changeEtherBalance(user1.address, parseEther("1"));

      const order = await shopPayment.orders(orderId);
      expect(order[3]).to.eq(Status.CANCELLED);
    });

    it("deliver paid order", async () => {
      const orderId = "89b068c4-3ffd-4a16-902b-b3ded45c151b";

      await shopPayment
        .connect(user1)
        .createAndPayOrder(orderId, parseEther("1"), ZERO_ADDRESS, {
          value: parseEther("1"),
        });

      const tx = await shopPayment.connect(owner).deliverOrder([orderId]);
      await expect(tx).to.emit(shopPayment, "OrderDelivered");

      const order = await shopPayment.orders(orderId);
      expect(order[3]).to.eq(Status.DELIVERED);

      const withdrawable = await shopPayment.withdrawable(ZERO_ADDRESS);
      expect(withdrawable).to.eq(parseEther("1"));

      const withdrawTx = await shopPayment.connect(owner).withdrawAll();
      expect(withdrawTx).to.changeEtherBalance(owner, parseEther("1"));
    });
  });

  describe("--- PAY ORDER WITH YSK ---", () => {
    beforeEach(async () => {
      await shopPayment.connect(owner).addPayableToken(yuTokenAddress);

      await yuToken
        .connect(owner)
        .mint(await user1.getAddress(), parseEther("1000"));
      await yuToken.connect(user1).approve(paymentAddress, parseEther("1000"));
    });

    it("should pay order", async () => {
      const orderId = "89b068c4-3ffd-4a16-902b-b3ded45c151b";

      const tx = await shopPayment
        .connect(user1)
        .createAndPayOrder(orderId, parseEther("1"), yuTokenAddress);

      await expect(tx).to.emit(shopPayment, "OrderPaid");
      await expect(tx).changeTokenBalance(
        yuToken,
        user1.address,
        -parseEther("1"),
      );

      const order = await shopPayment.orders(orderId);

      expect(order[0]).to.eq(orderId);
      expect(order[1]).to.eq(user1.address);
      expect(order[2]).to.eq(parseEther("1"));
      expect(order[3]).to.eq(Status.PAID);
      expect(order[5]).to.eq(yuTokenAddress);
    });

    it("cancel paid order", async () => {
      const orderId = "89b068c4-3ffd-4a16-902b-b3ded45c151b";

      await shopPayment
        .connect(user1)
        .createAndPayOrder(orderId, parseEther("1"), yuTokenAddress);

      const tx = await shopPayment.connect(user1).cancelOrder(orderId);
      await expect(tx).to.emit(shopPayment, "OrderCancelled");
      await expect(tx).changeTokenBalance(
        yuToken,
        user1.address,
        parseEther("1"),
      );

      const order = await shopPayment.orders(orderId);
      expect(order[3]).to.eq(Status.CANCELLED);
    });

    it("deliver paid order", async () => {
      const orderId = "89b068c4-3ffd-4a16-902b-b3ded45c151b";

      await shopPayment
        .connect(user1)
        .createAndPayOrder(orderId, parseEther("1"), yuTokenAddress);

      const tx = await shopPayment.connect(owner).deliverOrder([orderId]);
      await expect(tx).to.emit(shopPayment, "OrderDelivered");

      const order = await shopPayment.orders(orderId);
      expect(order[3]).to.eq(Status.DELIVERED);

      const withdrawable = await shopPayment.withdrawable(yuTokenAddress);
      expect(withdrawable).to.eq(parseEther("1"));

      const withdrawTx = await shopPayment.connect(owner).withdrawAll();
      await expect(withdrawTx).changeTokenBalance(
        yuToken,
        owner.address,
        parseEther("1"),
      );
    });
  });

  describe("--- PAY ORDER WITH ETH and YSK ---", () => {
    beforeEach(async () => {
      await shopPayment.connect(owner).addPayableToken(yuTokenAddress);

      await yuToken
        .connect(owner)
        .mint(await user1.getAddress(), parseEther("1000"));
      await yuToken.connect(user1).approve(paymentAddress, parseEther("1000"));
    });

    it("deliver paid order", async () => {
      const orderId = "89b068c4-3ffd-4a16-902b-b3ded45c151b";

      await shopPayment
        .connect(user1)
        .createAndPayOrder(orderId, parseEther("1"), yuTokenAddress);

      const orderId2 = "89b068c4-3ffd-4a16-902b-b3ded45c151a";
      await shopPayment
        .connect(user2)
        .createAndPayOrder(orderId2, parseEther("1"), ZERO_ADDRESS, {
          value: parseEther("1"),
        });

      const tx = await shopPayment
        .connect(owner)
        .deliverOrder([orderId, orderId2]);
      await expect(tx).to.emit(shopPayment, "OrderDelivered");

      const order = await shopPayment.orders(orderId);
      expect(order[3]).to.eq(Status.DELIVERED);

      const withdrawable = await shopPayment.withdrawable(yuTokenAddress);
      const withdrawable2 = await shopPayment.withdrawable(ZERO_ADDRESS);
      expect(withdrawable).to.eq(parseEther("1"));
      expect(withdrawable2).to.eq(parseEther("1"));

      const withdrawTx = await shopPayment.connect(owner).withdrawAll();
      await expect(withdrawTx).changeEtherBalance(
        owner.address,
        parseEther("1"),
      );
      await expect(withdrawTx).changeTokenBalance(
        yuToken,
        owner.address,
        parseEther("1"),
      );
    });
  });

  describe("--- UPGRADES ---", () => {
    it("should upgrade contract", async () => {
      const implAddressBefore =
        await upgrades.erc1967.getImplementationAddress(paymentAddress);

      console.log({
        proxyAddress: paymentAddress,
        implAddressBefore,
      });

      const ShopPaymentV2 = await ethers.getContractFactory("ShopPaymentV2");
      const proxyAfter = await upgrades.upgradeProxy(
        paymentAddress,
        ShopPaymentV2,
      );
      await proxyAfter.waitForDeployment();

      const newAddress =
        await upgrades.erc1967.getImplementationAddress(paymentAddress);
      console.log("ShopPayment has new implementation: ", newAddress);

      const upgradedShopPayment = ShopPaymentV2.attach(
        paymentAddress,
      ) as ShopPaymentV2;

      const version = await upgradedShopPayment.getVertion();
      expect(version).to.eq(2);
    });
  });
});
