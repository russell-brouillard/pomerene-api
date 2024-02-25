
//contracts/SkiTicketNFT.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SkiGuidePass is ERC721URIStorage, Ownable {
    uint256 private _currentTokenId = 0;

    constructor() ERC721("SkiGuidePass", "SGP") {}

    function mintPass(address recipient, string memory tokenURI) public onlyOwner returns (uint256) {
        uint256 newTokenId = ++_currentTokenId;
        _mint(recipient, newTokenId);
        _setTokenURI(newTokenId, tokenURI);

        return newTokenId;
    }
}
