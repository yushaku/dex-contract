import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { GaslessSwap } from "../typechain";

describe("GaslessSwap (EIP-712)", () => {
  let gaslessSwap: GaslessSwap;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let relayer: SignerWithAddress;

  before(async () => {
    [owner, user, relayer] = await ethers.getSigners();
    const GaslessSwapFactory = await ethers.getContractFactory("GaslessSwap");
    gaslessSwap = await GaslessSwapFactory.deploy();
    await gaslessSwap.waitForDeployment();
  });

  describe("EIP-712 Domain Separator", () => {
    it("Should return correct domain separator", async () => {
      const address = await gaslessSwap.getAddress();

      const domain = {
        name: "GaslessSwap",
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: address,
      };

      const eip712Domain = await gaslessSwap.eip712Domain();

      expect(eip712Domain[1]).to.equal(domain.name);
      expect(eip712Domain[2]).to.equal(domain.version);
      expect(eip712Domain[3]).to.equal(domain.chainId);
      expect(eip712Domain[4]).to.equal(address);
    });
  });

  describe("executeMetaTransaction", async () => {
    const tokenIn = ethers.ZeroAddress; // Use ETH for simplicity
    const tokenOut = ethers.ZeroAddress;
    const amountIn = ethers.parseEther("1");
    let deadline: number;

    const domain = {
      name: "GaslessSwap",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await gaslessSwap.getAddress(),
    };

    const types = {
      SwapRequest: [
        { name: "user", type: "address" },
        { name: "tokenIn", type: "address" },
        { name: "tokenOut", type: "address" },
        { name: "amountIn", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };

    beforeEach(async () => {
      deadline = (await time.latest()) + 3600; // 1 hour from now
    });

    it("Should execute swap with valid EIP-712 signature", async () => {
      // 1. Prepare EIP-712 typed data
      const swapRequest = {
        user: user.address,
        tokenIn,
        tokenOut,
        amountIn,
        deadline,
      };

      // 2. User signs the data off-chain
      const signature = await user.signTypedData(domain, types, swapRequest);

      // 3. Relayer submits the meta-transaction
      const tx = gaslessSwap
        .connect(relayer)
        .metaTransaction(swapRequest, signature);

      await expect(tx)
        .to.emit(gaslessSwap, "SwapExecuted")
        .withArgs(user.address, tokenIn, tokenOut, amountIn);
    });

    it("Should reject expired deadline", async () => {
      const expiredDeadline = (await time.latest()) - 1; // Already expired
      const swapRequest = {
        user: user.address,
        tokenIn,
        tokenOut,
        amountIn,
        deadline: expiredDeadline,
      };

      const signature = await user.signTypedData(domain, types, swapRequest);

      await expect(
        gaslessSwap.connect(relayer).metaTransaction(swapRequest, signature),
      ).to.be.revertedWith("Deadline expired");
    });

    it("Should reject invalid signature", async () => {
      const swapRequest = {
        user: user.address,
        tokenIn,
        tokenOut,
        amountIn,
        deadline,
      };
      const signature = await owner.signTypedData(
        {
          name: "GaslessSwap",
          version: "1",
          chainId: 1,
          verifyingContract: await gaslessSwap.getAddress(),
        },
        {
          SwapRequest: [],
        },
        swapRequest,
      );

      await expect(
        gaslessSwap.connect(relayer).metaTransaction(swapRequest, signature),
      ).to.be.revertedWith("Invalid signature");
    });
  });
});
