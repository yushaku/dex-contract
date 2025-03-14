// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @author yushaku
/// @title ShopPayment
/// @title ShopPayment - Upgradeable Smart Contract for E-commerce Payments
/// @notice This contract allows users to create and pay for orders in a single step,

enum Status {
  PAID,
  DELIVERED,
  CANCELLED
}

struct Order {
  string orderId;
  address buyer;
  uint256 price;
  Status status;
  uint256 createdAt;
  address token;
}

error OrderAlreadyCancelled(string orderId);
error OrderDoesNotExist(string orderId);
error OnlyPaidOrderCanBeCancel(string orderId);
error SenderIsNotBuyer(address sender, address buyer);
error InvalidPaymentToken(address token);

contract ShopPayment is
  Initializable,
  OwnableUpgradeable,
  ReentrancyGuardUpgradeable,
  UUPSUpgradeable
{
  using SafeERC20 for IERC20Metadata;

  address public constant NATIVE_TOKEN = address(0);

  mapping(string => Order) public orders;
  mapping(address => string[]) public userOrders;

  address[] internal allowedTokens;
  mapping(address => bool) public payableToken;
  mapping(address => uint256) public withdrawable;

  // [OPTIONAL] Add a storage gap to allow future versions to add new variables without shifting storage
  uint256[50] private __gap;

  event OrderPaid(string orderId, address indexed buyer, uint256 price);
  event OrderCancelled(string orderId, address indexed buyer, uint256 refundAmount);
  event OrderDelivered(string orderId, address indexed buyer);
  event Withdrawn(address token, uint256 amount);

  /// @notice Initializer function (replaces constructor for upgradeable contracts)
  function initialize() public initializer {
    __Ownable_init(msg.sender); // Initialize Ownable
    __ReentrancyGuard_init(); // Initialize ReentrancyGuard
    __UUPSUpgradeable_init(); // Initialize UUPSUpgradeable

    allowedTokens.push(NATIVE_TOKEN);
    payableToken[NATIVE_TOKEN] = true;
    withdrawable[NATIVE_TOKEN] = 0;
  }

  /// @notice Required by UUPSUpgradeable to authorize upgrades
  function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

  modifier isPayableToken(address _payToken) {
    require(_payToken == NATIVE_TOKEN || payableToken[_payToken], "invalid pay token");
    _;
  }

  // MARK: USER FUNCTIONS

  // function getVertion() external pure returns (string memory) {
  //   return "v2";
  // }

  /// @notice create a new order
  /// @param _orderId uuid of order
  /// @param _price price of order
  function createAndPayOrder(
    string calldata _orderId,
    uint256 _price,
    address _payToken
  ) external payable virtual nonReentrant isPayableToken(_payToken) {
    require(bytes(_orderId).length > 0, "Order ID cannot be empty");
    require(_price > 0, "Price must be greater than zero");
    require(orders[_orderId].buyer == address(0), "Order ID already exists");

    _takeToken(_payToken, _price);

    Order memory newOrder = Order({
      orderId: _orderId,
      buyer: msg.sender,
      price: _price,
      status: Status.PAID,
      createdAt: block.timestamp,
      token: _payToken
    });

    orders[_orderId] = newOrder;
    userOrders[msg.sender].push(_orderId);

    emit OrderPaid(_orderId, msg.sender, _price);
  }

  /// @notice cancel the order
  /// @param _orderId id of cancel order
  function cancelOrder(string memory _orderId) external nonReentrant {
    Order memory order = orders[_orderId];
    if (order.buyer == address(0)) revert OrderDoesNotExist(_orderId);
    if (msg.sender != order.buyer) revert SenderIsNotBuyer(msg.sender, order.buyer);
    if (order.status != Status.PAID) revert OnlyPaidOrderCanBeCancel(_orderId);

    _cancelOrder(_orderId);
  }

  function batchCancelOrder(string[] calldata orderIds) external nonReentrant {
    for (uint256 index = 0; index < orderIds.length; index++) {
      string memory _orderId = orderIds[index];
      Order memory order = orders[_orderId];

      //prettier-ignore
      if (msg.sender != order.buyer) revert SenderIsNotBuyer(msg.sender, order.buyer);
      if (order.status != Status.PAID) revert OnlyPaidOrderCanBeCancel(_orderId);
      if (order.buyer == address(0)) revert OrderDoesNotExist(_orderId);

      _cancelOrder(_orderId);
    }
  }

  /// @notice admin force cancel order
  /// @notice when order has paid and delivered still be canceled by admin
  /// @param orderIds is a list of order
  function forceCancelOrder(string[] calldata orderIds) external onlyOwner {
    for (uint256 index = 0; index < orderIds.length; index++) {
      string memory _orderId = orderIds[index];
      Order memory order = orders[_orderId];

      //prettier-ignore
      if (order.status == Status.CANCELLED) revert OrderAlreadyCancelled(_orderId);
      if (order.buyer == address(0)) revert OrderDoesNotExist(_orderId);

      _cancelOrder(_orderId);
    }
  }

  function deliverOrder(string[] memory orderIds) external onlyOwner {
    for (uint256 index = 0; index < orderIds.length; index++) {
      _deliverOrder(orderIds[index]);
    }
  }

  function withdrawAll() external onlyOwner nonReentrant {
    address owner = owner();

    for (uint256 index = 0; index < allowedTokens.length; index++) {
      address token = allowedTokens[index];
      uint256 amount = withdrawable[token];

      if (amount > 0) {
        _sendToken(token, owner, amount);
        emit Withdrawn(token, amount);
      }
    }
  }

  /// @notice get order info
  /// @param _orderId id of the order
  /// @return Order info
  function getOrder(string calldata _orderId) external view returns (Order memory) {
    Order memory order = orders[_orderId];
    return order;
  }

  /// @notice get list of order of user
  /// @param _buyer address of user
  /// @return string[] list of order id
  function getUserOrders(address _buyer) external view returns (string[] memory) {
    return userOrders[_buyer];
  }

  // MARK: ADMIN FUNCTIONS
  function addPayableToken(address _token) external onlyOwner {
    if (_token == address(0)) revert InvalidPaymentToken(_token);
    require(!payableToken[_token], "already payable token");

    payableToken[_token] = true;
    allowedTokens.push(_token);
  }

  function disableToken(address _token) external onlyOwner {
    if (_token == address(0)) revert InvalidPaymentToken(_token);
    payableToken[_token] = false;
  }

  // MARK: INTERNAL FUNCTIONS
  function _cancelOrder(string memory _orderId) internal {
    Order storage order = orders[_orderId];
    order.status = Status.CANCELLED;

    // REFUND TO THE USER
    _sendToken(order.token, order.buyer, order.price);

    emit OrderCancelled(_orderId, order.buyer, order.price);
  }

  function _deliverOrder(string memory _orderId) internal {
    Order storage order = orders[_orderId];
    if (order.buyer == address(0)) revert OrderDoesNotExist(_orderId);
    require(order.status == Status.PAID, "Only PAID orders can be delivered");

    order.status = Status.DELIVERED;
    withdrawable[order.token] += order.price;

    emit OrderDelivered(_orderId, order.buyer);
  }

  function _sendToken(address token, address to, uint256 amount) private {
    if (amount == 0) return;

    if (token == NATIVE_TOKEN) {
      require(address(this).balance >= amount, "Insufficient balance in contract.");
      (bool success, ) = to.call{ value: amount }("");
      require(success, "Transfer failed.");
    } else {
      IERC20Metadata(token).safeTransfer(to, amount);
    }
  }

  function _takeToken(address token, uint256 amount) internal {
    if (amount == 0) return;

    if (token == NATIVE_TOKEN) {
      require(msg.value >= amount, "Incorrect payment amount");
    } else {
      IERC20Metadata(token).safeTransferFrom(msg.sender, address(this), amount);
    }
  }
}
