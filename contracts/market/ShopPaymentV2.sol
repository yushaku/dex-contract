// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import { ShopPayment } from "./ShopPayment.sol";

contract ShopPaymentV2 is ShopPayment {
  function getOrder() external view returns (string[] memory) {
    return userOrders[msg.sender];
  }

  function getVertion() external pure override returns (uint8) {
    return 2;
  }
}
