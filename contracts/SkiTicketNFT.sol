// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";

import "@openzeppelin/contracts/access/Ownable.sol";

contract SkiTicket is ERC721, ERC721Burnable, Ownable {
    uint256 private _nextTokenId = 0;

    constructor() ERC721("SkiTicket", "SKITKT") {}

    function issueTicket(address to) public onlyOwner {
        _safeMint(to, _nextTokenId++);
    }

    // Add any additional functions you need for your tickets here
}
