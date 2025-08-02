// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./IOrderMixin.sol";

interface IPostInteraction {
    /**
     * @notice Callback method that gets called after all fund transfers
     * @param order Order being processed
     * @param orderHash Hash of the order being processed
     * @param taker Taker address
     * @param makingAmount Actual making amount
     * @param takingAmount Actual taking amount
     * @param extraData Extra data
     */
    function postInteraction(
        IOrderMixin.Order calldata order,
        bytes32 orderHash,
        address taker,
        uint256 makingAmount,
        uint256 takingAmount,
        bytes calldata extraData
    ) external;
}