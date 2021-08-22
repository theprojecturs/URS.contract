//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../URSFactory.sol";

contract Test_URSStoreForFactory {
    URSFactory private ursFactory;

    constructor(address _ursFactory) {
        ursFactory = URSFactory(_ursFactory);
    }

    function mint(address to) external {
        ursFactory.mint(to);
    }
}
