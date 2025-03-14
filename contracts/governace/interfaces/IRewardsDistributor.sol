// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface IRewardsDistributor {
  event CheckpointToken(uint time, uint tokens);
  event Claimed(uint tokenId, uint amount, uint claim_epoch, uint max_epoch);

  function checkpoint_token() external;

  function voting_escrow() external view returns (address);

  function checkpoint_total_supply() external;

  function claimable(uint _tokenId) external view returns (uint);
}
