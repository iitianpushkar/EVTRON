// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {EscrowFactory} from "../src/EVM/cross-chain-swap/EscrowFactory.sol";

contract Deploy is Script {
    EscrowFactory public escrowfactory;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        escrowfactory = new EscrowFactory(0x41556c883A4B5962c0caCa46ff89f05b64edEa4f);

        console.log("EscrowFactory deployed at:", address(escrowfactory));
        console.log("EscrowSrc implementation at:", escrowfactory.ESCROW_SRC_IMPLEMENTATION());
        console.log("EscrowDst implementation at:", escrowfactory.ESCROW_DST_IMPLEMENTATION());

        vm.stopBroadcast();
    }
}
