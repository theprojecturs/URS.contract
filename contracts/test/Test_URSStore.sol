//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../URSStore.sol";

contract Test_URSStore is URSStore {
    constructor() URSStore() {}

    function testCalculateValidTicketAmount(
        uint256 index,
        uint256 amount,
        uint256 _slotSize,
        uint256 _offsetInSlot,
        uint256 _lastTargetIndex
    ) public pure returns (uint256) {
        return
            calculateValidTicketAmount(
                index,
                amount,
                _slotSize,
                _offsetInSlot,
                _lastTargetIndex
            );
    }
}
