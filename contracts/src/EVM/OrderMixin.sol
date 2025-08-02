// SPDX-License-Identifier: MIT

pragma solidity ^0.8.25;

import "@openzeppelin/contracts/utils/math/Math.sol";
import { EIP712 } from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


import "@1inch/solidity-utils/contracts/interfaces/IWETH.sol";
import "@1inch/solidity-utils/contracts/libraries/SafeERC20.sol";

import "./limit-order-protocol/interfaces/IOrderMixin.sol";
import "./limit-order-protocol/interfaces/IPostInteraction.sol";
import "./limit-order-protocol/interfaces/ITakerInteraction.sol";
import "./limit-order-protocol/libraries/RemainingInvalidatorLib.sol";
import "./OrderLib.sol";

contract OrderMixin is IOrderMixin, EIP712("1inch Limit Order Protocol", "4"){
    using SafeERC20 for IERC20;
    using SafeERC20 for IWETH;
    using OrderLib for IOrderMixin.Order;
    using RemainingInvalidatorLib for RemainingInvalidator;

 
    address private _cross_chain_swap;


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
        bytes calldata signature,
        bytes calldata extradata 
    ) external returns(bytes32  orderHash ) {

        orderHash = order.hash(_domainSeparatorV4());
        if(order.maker == address(0) || !ECDSA.recoverOrIsValidSignature(order.maker, orderHash, signature)) revert IOrderMixin.BadSignature();

        IPostInteraction(_cross_chain_swap).postInteraction(
                order, orderHash, msg.sender, order.makingAmount, order.takingAmount,extradata
            );

        emit OrderFilled(orderHash, order.makingAmount, order.takingAmount);
        
    }

    function setCrossChainSwap(address crossChainSwap) external {
        _cross_chain_swap = crossChainSwap;
    }

}