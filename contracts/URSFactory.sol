//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract URSFactory is ERC721 {
    string public baseURI;
    uint256 public totalSupply;
    address public owner;
    address public operator;

    event SetOperator(address operator);
    event SetBaseURI(string baseURI);

    constructor(string memory __baseURI) ERC721("URS", "URS") {
        owner = msg.sender;
        baseURI = __baseURI;
    }

    modifier onlyOwner() {
        require(owner == msg.sender, "caller is not ther owner");
        _;
    }

    modifier onlyOwnerOrOperator() {
        require(
            operator == msg.sender || owner == msg.sender,
            "caller is neither operator nor owner"
        );
        _;
    }

    function setOperator(address _operator) external onlyOwner {
        operator = _operator;
        emit SetOperator(_operator);
    }

    function setBaseURI(string memory __baseURI) external onlyOwner {
        baseURI = __baseURI;
        emit SetBaseURI(__baseURI);
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return baseURI;
    }

    function mint(address to) public onlyOwnerOrOperator {
        _mint(to, totalSupply);
        totalSupply += 1;
    }
}
