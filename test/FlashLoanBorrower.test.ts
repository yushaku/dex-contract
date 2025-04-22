import { expect } from "chai";
import { parseEther } from "ethers";
import { ethers } from "hardhat";
import { FlashLoanBorrower, FlashLoanProviderMock, USDT } from "../typechain";

describe("FlashLoanBorrower", function () {
  let token: USDT;
  let tokenAddress: string;
  let lender: FlashLoanProviderMock;
  let lenderAddress: string;
  let borrower: FlashLoanBorrower;
  let deployer: any;
  let user: any;

  const initialLiquidity = parseEther("1000");
  const flashLoanAmount = parseEther("100");

  beforeEach(async () => {
    [deployer, user] = await ethers.getSigners();

    // Deploy ERC20 mock
    const Token = await ethers.getContractFactory("USDT");
    token = await Token.deploy();
    await token.mint(deployer.address, initialLiquidity);
    tokenAddress = await token.getAddress();

    // Deploy lender
    const Lender = await ethers.getContractFactory("FlashLoanProviderMock");
    lender = await Lender.deploy(tokenAddress);
    lenderAddress = await lender.getAddress();

    // Approve and deposit to lender

    await token.approve(lenderAddress, initialLiquidity);
    await lender.deposit(initialLiquidity);

    // Deploy borrower
    const Borrower = await ethers.getContractFactory("FlashLoanBorrower");
    borrower = await Borrower.deploy(lenderAddress, tokenAddress);
    const borrowerAddress = await borrower.getAddress();

    // Fund borrower with enough to pay fee if needed
    await token.mint(borrowerAddress, parseEther("1"));
  });

  it("should execute flash loan and repay with fee", async () => {
    const fee = await lender.flashFee(tokenAddress, flashLoanAmount);
    const balanceBefore = await token.balanceOf(lenderAddress);

    const tx = await borrower.requestFlashLoan(flashLoanAmount);
    await tx.wait();

    const balanceAfter = await token.balanceOf(lenderAddress);
    const expected = balanceBefore + fee;

    expect(balanceAfter).to.equal(expected);
  });

  it("should emit events", async () => {
    await expect(borrower.requestFlashLoan(flashLoanAmount))
      .to.emit(borrower, "LoanRequested")
      .withArgs(flashLoanAmount)
      .and.to.emit(borrower, "LoanExecuted")
      .withArgs(
        flashLoanAmount,
        await lender.flashFee(tokenAddress, flashLoanAmount),
      )
      .and.to.emit(borrower, "ProfitSimulated");
  });
});
