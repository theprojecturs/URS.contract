//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../MintPass.sol";

contract Test_MintPass is MintPass {
    constructor(
        string memory __name,
        string memory __symbol,
        string memory __baseURI
    ) MintPass(__name, __symbol, __baseURI) {}

    function mint(address to, uint256 tokenId) external {
        _mint(to, tokenId);
    }
}
