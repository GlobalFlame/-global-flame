// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SacredFlame {
    address public founder;

    event FlameIgnited(address indexed igniter);

    constructor() {
        founder = msg.sender;
        emit FlameIgnited(founder);
    }

    function getFlameStatus() public view returns (string memory) {
        return "The Sacred Flame is alive.";
    }
}
