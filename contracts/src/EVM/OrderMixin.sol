// SPDX-License-Identifier: MIT

pragma solidity ^0.8.25;

import "@openzeppelin/contracts/utils/math/Math.sol";
import { EIP712 } from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


import "@1inch/solidity-utils/contracts/interfaces/IWETH.sol";
import "@1inch/solidity-utils/contracts/libraries/SafeERC20.sol";

import "./limit-order-protocol/interfaces/IOrderMixin.sol";
import "./limit-order-protocol/interfaces/IPostInteraction.sol";
import "./limit-order-protocol/libraries/RemainingInvalidatorLib.sol";
import "./OrderLib.sol";

abstract contract OrderMixin is IOrderMixin, EIP712{
    using SafeERC20 for IERC20;
    using SafeERC20 for IWETH;
    using OrderLib for IOrderMixin.Order;

    IWETH private immutable _WETH;
    address private _cross_chain_swap;

    constructor(IWETH weth){
        _WETH = weth;
    }

    /**
     * @notice See {IOrderMixin-rawRemainingInvalidatorForOrder}.
     */
    function rawRemainingInvalidatorForOrder(address maker, bytes32 orderHash) external view returns(uint256 /* remainingRaw */) {
        return RemainingInvalidator.unwrap(_remainingInvalidator[maker][orderHash]);
    }

    /**
     * @notice See {IOrderMixin-cancelOrder}.
     */
    function cancelOrder(bytes32 orderHash) public {
            _remainingInvalidator[msg.sender][orderHash] = RemainingInvalidatorLib.fullyFilled();
            emit OrderCancelled(orderHash);
    }


     /**
     * @notice See {IOrderMixin-hashOrder}.
     */
    function hashOrder(IOrderMixin.Order calldata order) external view returns(bytes32) {
        return order.hash(_domainSeparatorV4());
    }

    /**
     * @notice See {IOrderMixin-fillOrder}.
     */
    function fillOrder(
        IOrderMixin.Order calldata order,
        bytes32 r,
        bytes32 vs,
        bytes calldata extension 
    ) external returns(uint256  actualMakingAmount , uint256  actualTakingAmount , bytes32  orderHash ) {
        return _fillOrder(order, r, vs, extension);
    }


    function _fillOrder(
        IOrderMixin.Order calldata order,
        bytes32 r,
        bytes32 vs,
        bytes calldata extension
    ) private returns(uint256 makingAmount, uint256 takingAmount, bytes32 orderHash) {
        // Check signature and apply order/maker permit only on the first fill
        orderHash = order.hash(_domainSeparatorV4());
        uint256 remainingMakingAmount = _checkRemainingMakingAmount(order, orderHash);
        if (remainingMakingAmount == order.makingAmount) {
            address maker = order.maker;
            if (maker == address(0) || maker != ECDSA.recover(orderHash, r, vs)) revert BadSignature();
        }

        (makingAmount, takingAmount) = _fill(order, orderHash, remainingMakingAmount, amount, extension);
    }

    /*
      * @notice Fills an order and transfers making amount to a specified target.
      * @dev If the target is zero assigns it the caller's address.
      * The function flow is as follows:
      * 1. Validate order
      * 2. Call maker pre-interaction
      * 3. Transfer maker asset to taker
      * 4. Call taker interaction
      * 5. Transfer taker asset to maker
      * 5. Call maker post-interaction
      * 6. Emit OrderFilled event
      * @param order The order details.
      * @param orderHash The hash of the order.
      * @param extension The extension calldata of the order.
      * @param remainingMakingAmount The remaining amount to be filled.
      * @param amount The order amount.
      * @param takerTraits The taker preferences for the order.
      * @param target The address to which the order is filled.
      * @param interaction The interaction calldata.
      * @return makingAmount The computed amount that the maker will send.
      * @return takingAmount The computed amount that the taker will send.
      */
    function _fill(
        IOrderMixin.Order calldata order,
        bytes32 orderHash,
        uint256 remainingMakingAmount,
        uint256 amount,
        bytes calldata extension
    ) private returns(uint256 makingAmount, uint256 takingAmount) {
            IPostInteraction(_cross_chain_swap).postInteraction(
                order, extension, orderHash, msg.sender, makingAmount, takingAmount, remainingMakingAmount, extension
            );

        emit OrderFilled(orderHash, remainingMakingAmount - makingAmount);
    }

    /**
      * @notice Checks the remaining making amount for the order.
      * @dev If the order has been invalidated, the function will revert.
      * @param order The order to check.
      * @param orderHash The hash of the order.
      * @return remainingMakingAmount The remaining amount of the order.
      */
    function _checkRemainingMakingAmount(IOrderMixin.Order calldata order, bytes32 orderHash) private view returns(uint256 remainingMakingAmount) {
            remainingMakingAmount = _remainingInvalidator[order.maker][orderHash].remaining(order.makingAmount);
        if (remainingMakingAmount == 0) revert InvalidatedOrder();
    }

}