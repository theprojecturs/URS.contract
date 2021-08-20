//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MintPass is ERC721 {
    address public owner;
    bool public paused = true;
    string public baseURI;

    uint256 public totalSupply = 0;
    uint256 public constant MAX_SUPPLY = 500;

    mapping(address => bool) holdPass;

    event Paused();
    event Unpaused();

    constructor(
        string memory __name,
        string memory __symbol,
        string memory __baseURI
    ) ERC721(__name, __symbol) {
        owner = msg.sender;
        baseURI = __baseURI;
    }

    modifier onlyOwner() {
        require(owner == msg.sender, "caller is not the owner");
        _;
    }

    function pause() external onlyOwner {
        paused = true;
        emit Paused();
    }

    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused();
    }

    function tokenURI(uint256)
        public
        view
        virtual
        override
        returns (string memory)
    {
        return baseURI;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, tokenId);

        require(!_exists(tokenId) || !paused, "token transfer while paused");
    }

    function claimPass(bytes memory _signature, uint256 _passAmount) external {
        require(!holdPass[msg.sender], "Already received pass");

        bytes32 messageHash = keccak256(
            abi.encodePacked(msg.sender, _passAmount)
        );
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        require(_signature.length == 65, "Invalid signature");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(_signature, 32))
            s := mload(add(_signature, 64))
            v := byte(0, mload(add(_signature, 96)))
        }
        address signer = ecrecover(ethSignedMessageHash, v, r, s);
        require(signer == owner, "Signature is not from the owner");

        holdPass[msg.sender] = true;

        for (uint256 i = totalSupply; i < _passAmount + totalSupply; i += 1) {
            _mint(msg.sender, i);
        }

        totalSupply += _passAmount;
        require(totalSupply <= MAX_SUPPLY, "invalid amount of pass to mint");
    }
}
