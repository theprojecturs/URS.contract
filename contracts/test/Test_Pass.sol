//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../Pass.sol";

contract Test_Pass is Pass {
    constructor(
        string memory __name,
        string memory __symbol,
        string memory __baseURI
    ) Pass(__name, __symbol, __baseURI) {}

    function mint(address to, uint256 tokenId) external {
        _mint(to, tokenId);
    }
}
