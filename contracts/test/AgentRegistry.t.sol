// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";

contract AgentRegistryTest is Test {
    AgentRegistry private s_registry;
    address private s_alice;
    address private s_bob;

    function setUp() public {
        s_registry = new AgentRegistry();
        s_alice = makeAddr("alice");
        s_bob = makeAddr("bob");
    }

    /*//////////////////////////////////////////////////////////////
                           REGISTER AGENT
    //////////////////////////////////////////////////////////////*/

    function test_RegisterAgent(string calldata ensName, bytes32 capabilitiesHash) public {
        vm.assume(bytes(ensName).length > 0);

        vm.prank(s_alice);
        uint256 tokenId = s_registry.registerAgent(ensName, capabilitiesHash);

        assertEq(tokenId, 1);

        AgentRegistry.AgentMetadata memory meta = s_registry.getAgent(tokenId);
        assertEq(meta.ensName, ensName);
        assertEq(meta.capabilitiesHash, capabilitiesHash);
        assertEq(meta.isActive, true);
        assertGt(meta.registeredAt, 0);
    }

    function test_RevertWhen_AlreadyRegistered() public {
        vm.prank(s_alice);
        s_registry.registerAgent("alice.eth", keccak256("caps"));

        vm.prank(s_alice);
        vm.expectRevert(AgentRegistry.AgentRegistry__AlreadyRegistered.selector);
        s_registry.registerAgent("alice2.eth", keccak256("caps2"));
    }

    function test_RevertWhen_ENSAlreadyTaken() public {
        vm.prank(s_alice);
        s_registry.registerAgent("shared.eth", keccak256("caps"));

        vm.prank(s_bob);
        vm.expectRevert(AgentRegistry.AgentRegistry__ENSAlreadyTaken.selector);
        s_registry.registerAgent("shared.eth", keccak256("caps2"));
    }

    /*//////////////////////////////////////////////////////////////
                          DEACTIVATE / REACTIVATE
    //////////////////////////////////////////////////////////////*/

    function test_DeactivateAgent() public {
        vm.prank(s_alice);
        uint256 tokenId = s_registry.registerAgent("alice.eth", keccak256("caps"));

        vm.prank(s_alice);
        s_registry.deactivateAgent(tokenId);

        assertFalse(s_registry.isAgentActive(tokenId));
    }

    function test_ReactivateAgent() public {
        vm.prank(s_alice);
        uint256 tokenId = s_registry.registerAgent("alice.eth", keccak256("caps"));

        vm.prank(s_alice);
        s_registry.deactivateAgent(tokenId);

        vm.prank(s_alice);
        s_registry.reactivateAgent(tokenId);

        assertTrue(s_registry.isAgentActive(tokenId));
    }

    /*//////////////////////////////////////////////////////////////
                           LOOKUP FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function test_GetAgentByAddress() public {
        vm.prank(s_alice);
        uint256 tokenId = s_registry.registerAgent("alice.eth", keccak256("caps"));

        uint256 found = s_registry.getAgentByAddress(s_alice);
        assertEq(found, tokenId);
    }

    function test_GetAgentByENS() public {
        vm.prank(s_alice);
        s_registry.registerAgent("alice.eth", keccak256("caps"));

        uint256 found = s_registry.getAgentByENS("alice.eth");
        assertEq(found, 1);
    }

    function test_TotalRegistered(uint256 count) public {
        count = bound(count, 0, 20);

        for (uint256 i; i < count; ++i) {
            address agent = makeAddr(string(abi.encodePacked("agent", i)));
            vm.prank(agent);
            s_registry.registerAgent(
                string(abi.encodePacked("agent", i, ".eth")),
                keccak256(abi.encode(i))
            );
        }

        assertEq(s_registry.totalRegistered(), count);
    }
}
