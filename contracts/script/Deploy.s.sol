// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {ServiceAgreement} from "../src/ServiceAgreement.sol";
import {TrustNFT} from "../src/TrustNFT.sol";

contract Deploy is Script {
    function run() external returns (
        AgentRegistry registry,
        ServiceAgreement agreement,
        TrustNFT trustNFT
    ) {
        vm.startBroadcast();

        registry = new AgentRegistry();
        trustNFT = new TrustNFT();
        agreement = new ServiceAgreement();

        trustNFT.setAgreementContract(address(agreement));

        vm.stopBroadcast();
    }
}
