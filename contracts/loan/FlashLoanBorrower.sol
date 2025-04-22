// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/interfaces/IERC3156FlashBorrower.sol";
import "@openzeppelin/contracts/interfaces/IERC3156FlashLender.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FlashLoanBorrower is IERC3156FlashBorrower, Ownable {
  IERC3156FlashLender public immutable lender;
  address public immutable token;

  constructor(IERC3156FlashLender _lender, address _token) Ownable(msg.sender) {
    lender = _lender;
    token = _token;
  }

  function requestFlashLoan(uint256 amount) external onlyOwner {
    bytes memory data = abi.encode("any-data");

    // Lấy tên token dưới dạng string vì ERC-3156 dùng string
    // string memory symbol = IERC20Metadata(token).symbol();

    // Gọi flash loan
    lender.flashLoan(IERC3156FlashBorrower(address(this)), token, amount, data);
  }

  /// Hàm bắt buộc của chuẩn ERC-3156
  function onFlashLoan(
    address initiator,
    address _token,
    uint256 amount,
    uint256 fee,
    bytes calldata data
  ) external override returns (bytes32) {
    require(msg.sender == address(lender), "Untrusted lender");
    require(_token == token, "Unsupported token");

    // 👉 Xử lý logic chính tại đây (ví dụ: arbitrage, thanh lý...)

    // ✅ Trả nợ
    IERC20(token).approve(address(lender), amount + fee);

    return keccak256("ERC3156FlashBorrower.onFlashLoan");
  }
}
