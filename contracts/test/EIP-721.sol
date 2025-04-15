// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract GaslessSwap is EIP712 {
  event SwapExecuted(address user, address tokenIn, address tokenOut, uint256 amountIn);

  using ECDSA for bytes32;

  // Cấu trúc dữ liệu EIP-712
  struct SwapRequest {
    address user;
    address tokenIn;
    address tokenOut;
    uint256 amountIn;
    uint256 deadline;
  }

  bytes32 private constant _SWAP_TYPEHASH =
    keccak256(
      "SwapRequest(address user,address tokenIn,address tokenOut,uint256 amountIn,uint256 deadline)"
    );

  constructor() EIP712("GaslessSwap", "1") {}

  function metaTransaction(
    SwapRequest calldata request,
    bytes calldata signature
  ) external {
    // 1. Kiểm tra deadline
    require(block.timestamp <= request.deadline, "Deadline expired");

    // 2. Xác thực chữ ký EIP-712
    bytes32 digest = _hashTypedDataV4(
      keccak256(
        abi.encode(
          _SWAP_TYPEHASH,
          request.user,
          request.tokenIn,
          request.tokenOut,
          request.amountIn,
          request.deadline
        )
      )
    );
    address signer = digest.recover(signature);
    require(signer == request.user, "Invalid signature");

    // 3. Thực hiện swap (logic chính)
    _swap(request.user, request.tokenIn, request.tokenOut, request.amountIn);
  }

  function _swap(
    address user,
    address tokenIn,
    address tokenOut,
    uint256 amountIn
  ) internal {
    emit SwapExecuted(user, tokenIn, tokenOut, amountIn);
  }
}
