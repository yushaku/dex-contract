// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ERC20Staking
 * @dev This contract allows users to stake ERC20 tokens and earn rewards over time.
 * It supports deposit, withdrawal, and reward claim functionalities.
 */
contract ERC20Staking is Ownable {
  using SafeERC20 for IERC20;

  /// @notice ERC20 token used for staking.
  IERC20 public stakingToken;

  /// @notice Reward token distributed as staking rewards.
  IERC20 public rewardToken;

  /// @notice Annual reward rate (in basis points, 100 = 1%).
  uint256 public annualRewardRateBasisPoints;

  /// @notice Minimum staking duration (in seconds).
  uint256 public minStakingDuration;

  struct StakerInfo {
    uint256 amount; // Amount of tokens staked by the user.
    uint256 stakingStartTime; // Timestamp when the user staked tokens.
    uint256 accumulatedRewards; // Accumulated rewards.
  }

  /// @notice Mapping to track user staking information.
  mapping(address => StakerInfo) public stakers;

  event Staked(address indexed user, uint256 amount);
  event Withdrawn(address indexed user, uint256 amount);
  event RewardClaimed(address indexed user, uint256 amount);

  /**
   * @dev Constructor to initialize the staking and reward tokens, reward rate, and minimum staking duration.
   * @param _stakingToken Address of the ERC20 token to be staked.
   * @param _rewardToken Address of the ERC20 token to be distributed as rewards.
   * @param _annualRewardRateBasisPoints Annual reward rate in basis points (1% = 100).
   * @param _minStakingDuration Minimum time in seconds that a user must stake to earn rewards.
   */
  constructor(
    address _stakingToken,
    address _rewardToken,
    uint256 _annualRewardRateBasisPoints,
    uint256 _minStakingDuration
  ) Ownable(msg.sender) {
    require(_stakingToken != address(0), "Invalid staking token address.");
    require(_rewardToken != address(0), "Invalid reward token address.");

    stakingToken = IERC20(_stakingToken);
    rewardToken = IERC20(_rewardToken);
    annualRewardRateBasisPoints = _annualRewardRateBasisPoints;
    minStakingDuration = _minStakingDuration;
  }

  /**
   * @notice Stake tokens in the contract.
   * @param amount The amount of tokens to stake.
   */
  function stake(uint256 amount) external {
    require(amount > 0, "Amount must be greater than zero.");
    stakingToken.safeTransferFrom(msg.sender, address(this), amount);

    // Update the staker's information.
    StakerInfo storage staker = stakers[msg.sender];
    _claimRewards(msg.sender);

    staker.amount += amount;
    if (staker.stakingStartTime == 0) {
      staker.stakingStartTime = block.timestamp;
    }

    emit Staked(msg.sender, amount);
  }

  /**
   * @notice Withdraw staked tokens along with any earned rewards.
   * @param amount The amount of tokens to withdraw.
   */
  function withdraw(uint256 amount) external {
    StakerInfo storage staker = stakers[msg.sender];
    require(staker.amount >= amount, "Withdraw amount exceeds staked balance.");

    _claimRewards(msg.sender);
    staker.amount -= amount;

    // Transfer the staking tokens back to the user.
    stakingToken.safeTransfer(msg.sender, amount);

    emit Withdrawn(msg.sender, amount);
  }

  /**
   * @notice Claim earned rewards without withdrawing staked tokens.
   */
  function claimRewards() external {
    _claimRewards(msg.sender);
  }

  /**
   * @dev Internal function to calculate and distribute rewards to the user.
   * @param stakerAddress The address of the staker claiming rewards.
   */
  function _claimRewards(address stakerAddress) internal {
    StakerInfo storage staker = stakers[stakerAddress];
    require(staker.stakingStartTime > 0, "No staking record found.");

    // Calculate rewards based on staking duration and reward rate.
    uint256 stakingDuration = block.timestamp - staker.stakingStartTime;
    if (stakingDuration >= minStakingDuration) {
      uint256 reward = _calculateRewards(staker.amount, stakingDuration);
      staker.accumulatedRewards += reward;
      staker.stakingStartTime = block.timestamp; // Reset the staking start time for new reward period.
    }

    // Transfer any accumulated rewards to the staker.
    if (staker.accumulatedRewards > 0) {
      uint256 rewardToTransfer = staker.accumulatedRewards;
      staker.accumulatedRewards = 0;

      rewardToken.safeTransfer(stakerAddress, rewardToTransfer);
      emit RewardClaimed(stakerAddress, rewardToTransfer);
    }
  }

  /**
   * @dev Internal function to calculate staking rewards based on duration and annual reward rate.
   * @param amount The amount of tokens staked.
   * @param stakingDuration The duration in seconds for which the tokens have been staked.
   * @return The reward amount.
   */
  function _calculateRewards(
    uint256 amount,
    uint256 stakingDuration
  ) internal view returns (uint256) {
    uint256 annualReward = (amount * annualRewardRateBasisPoints) / 10000;
    uint256 reward = (annualReward * stakingDuration) / 365 days;
    return reward;
  }

  /**
   * @notice Allows the owner to withdraw any ERC20 tokens mistakenly sent to the contract.
   * @param token Address of the ERC20 token to withdraw.
   * @param amount Amount of tokens to withdraw.
   */
  function recoverTokens(address token, uint256 amount) external onlyOwner {
    IERC20(token).safeTransfer(owner(), amount);
  }
}
