// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/interfaces/IERC3156FlashLender.sol";
import "@openzeppelin/contracts/interfaces/IERC3156FlashBorrower.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

contract FlashLoanProviderMock is IERC3156FlashLender, ERC165 {
  uint256 public constant FIXED_FEE = 1e15; // phí 0.001 token
  address public immutable token;

  constructor(address _token) {
    token = _token;
  }

  function maxFlashLoan(address _token) external view override returns (uint256) {
    return _token == token ? IERC20(token).balanceOf(address(this)) : 0;
  }

  function flashFee(address _token, uint256) external view override returns (uint256) {
    require(_token == token, "Unsupported token");
    return FIXED_FEE;
  }

  function flashLoan(
    IERC3156FlashBorrower receiver,
    address _token,
    uint256 amount,
    bytes calldata data
  ) external override returns (bool) {
    require(_token == token, "Unsupported token");

    uint256 balanceBefore = IERC20(token).balanceOf(address(this));
    require(balanceBefore >= amount, "Not enough tokens");

    // Gửi tiền
    IERC20(token).transfer(address(receiver), amount);

    // Gọi lại borrower
    require(
      receiver.onFlashLoan(msg.sender, _token, amount, FIXED_FEE, data) ==
        keccak256("ERC3156FlashBorrower.onFlashLoan"),
      "Invalid flash loan return"
    );

    // Xác nhận tiền + phí đã được hoàn lại
    uint256 expected = balanceBefore + FIXED_FEE;
    uint256 actual = IERC20(token).balanceOf(address(this));
    require(actual >= expected, "Loan not repaid");

    return true;
  }

  function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
    return
      interfaceId == type(IERC3156FlashLender).interfaceId ||
      super.supportsInterface(interfaceId);
  }

  // Cho nạp token vào contract
  function deposit(uint256 amount) external {
    IERC20(token).transferFrom(msg.sender, address(this), amount);
  }
}
