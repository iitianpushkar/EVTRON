// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {OrderMixin} from "../src/EVM/OrderMixin.sol";

contract Deploy is Script {
    OrderMixin public ordermixin;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        ordermixin = new OrderMixin();
        console.log("OrderMixin deployed at:", address(ordermixin));

        vm.stopBroadcast();
    }
}
