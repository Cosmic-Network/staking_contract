// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CosmicNetwork is ERC20, Ownable {

    uint256 public constant TIMELOCK = 1 days;
    uint256 public mintQueueCounter = 0;
    uint256 public mintExecutedCounter = 0;

    uint256 public maxSupply;
    uint256 public initialSupply = 100_000_000 * (10 ** decimals());

    struct MintRequest {
        uint256 amount;
        address to;
        uint256 mintAfter;
        uint256 executedOn;
    }

    mapping(uint256 => MintRequest) public mintQueue;

    constructor()
        ERC20("Cosmic Network", "COSMIC")
    {
        maxSupply = 200_000_000 * (10 ** decimals());
        _mint(msg.sender, initialSupply);
    }

    function mintRequest(uint256 amount, address to) external onlyOwner {
        mintQueue[mintQueueCounter] = MintRequest(amount, to, block.timestamp + TIMELOCK, 0);
        mintQueueCounter++;
    }

    function mintApprove(uint256 _id) external onlyOwner {
        // Timelock based minting
        MintRequest storage request = mintQueue[_id];
        require(request.mintAfter <= block.timestamp, "Mint request is not yet approved");
        require(request.executedOn == 0, "Mint request is already executed");
        require(request.amount > 0, "Invalid mint amount");
        require(totalSupply() + request.amount <= maxSupply, "Max supply reached");
        request.executedOn = block.timestamp;
        mintExecutedCounter++;
        _mint(request.to, request.amount);
    }
}
