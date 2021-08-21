//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./URSFactory.sol";

interface MintPass {
    function balanceOf(address) external view returns (uint256);
}

contract URSStore {
    using SafeMath for uint256;

    MintPass public mintPass;
    URSFactory public ursFactory;

    /**
        Store
     */
    address public owner;

    /**
        Numbers for URS Factory
     */
    uint256 public constant maxURS = 10000;

    /**
        Team withdraw fund
     */
    // newly minted URS after last fund withdraw
    uint256 internal newlyMintedURS = 0;
    // total eth claimed by the owner
    uint256 internal claimedEth = 0;

    /**
        Team allocated URS
     */
    // URS which is minted by the owner
    uint256 public preMintedURS = 0;
    // MAX URS which owner can mint
    uint256 public constant maxPreMintURS = 20;

    /**
        Mint Pass
     */
    uint256 public newlyMintedURSWithPass = 0;
    uint256 public constant maxURSPerPass = 20;
    mapping(address => uint256) public mintedURSOf;

    /**
        Scheduling
     */
    uint256 public openingHours;
    uint256 public constant operationSecondsForVIP = 3600 * 3; // 3 hours
    uint256 public constant operationSeconds = 3600 * 24; // 24 hours

    /**
        Ticket
     */
    uint256 public constant ticketPrice = 0.08 ether;
    uint256 public totalTickets = 0;
    mapping(address => ticket) public ticketsOf;
    struct ticket {
        uint256 index; // Incl
        uint256 amount;
    }

    /**
        Security
     */
    uint256 public constant maxMintPerTx = 20;

    /**
        Raffle
     */
    uint256 public raffleNumber;
    uint256 public offsetInSlot;
    uint256 public slotSize;
    mapping(address => result) public resultOf;
    struct result {
        bool executed;
        uint256 validTicketAmount;
    }

    event SetMintPass(address mintPass);
    event SetURSFactory(address ursFactory);
    event SetOpeningHours(uint256 openingHours);
    event MintWithPass(address account, uint256 amount, uint256 changes);
    event TakingTickets(address account, uint256 amount, uint256 changes);
    event RunRaffle(uint256 raffleNumber);
    event SetResult(
        address account,
        uint256 validTicketAmount,
        uint256 changes
    );
    event MintURS(address account, uint256 mintRequestAmount);
    event Withdraw();

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(owner == msg.sender, "caller is not the owner of the ticket");
        _;
    }

    modifier whenOpened() {
        require(
            block.timestamp >= openingHours + operationSecondsForVIP,
            "Store is not opened"
        );
        require(
            block.timestamp <
                openingHours + operationSecondsForVIP + operationSeconds,
            "Store is closed"
        );
        _;
    }

    modifier whenVIPOpened() {
        require(block.timestamp >= openingHours, "Store is not opened for VIP");
        require(
            block.timestamp < openingHours + operationSecondsForVIP,
            "Store is closed for VIP"
        );
        _;
    }

    function setMintPass(MintPass _mintPass) external onlyOwner {
        mintPass = _mintPass;
        emit SetMintPass(address(_mintPass));
    }

    function setURSFactory(URSFactory _ursFactory) external onlyOwner {
        ursFactory = _ursFactory;
        emit SetURSFactory(address(_ursFactory));
    }

    function setOpeningHours(uint256 _openingHours) external onlyOwner {
        openingHours = _openingHours;
        emit SetOpeningHours(_openingHours);
    }

    // Do not update newlyMintedURS to prevent withdrawal
    function preMintURS(address to) external onlyOwner {
        require(preMintedURS < maxPreMintURS, "Exceeds max pre-mint URS");
        ursFactory.mint(to);
        preMintedURS += 1;
    }

    function mintWithPass(uint256 _amount) external payable whenVIPOpened {
        require(_amount <= maxMintPerTx, "mint amount exceeds maximum");

        uint256 mintedURS = mintedURSOf[msg.sender];
        uint256 passAmount = mintPass.balanceOf(msg.sender);
        require(
            passAmount.mul(maxURSPerPass).sub(mintedURS) >= _amount,
            "Not enough Pass"
        );

        uint256 totalPrice = ticketPrice.mul(_amount);
        require(totalPrice <= msg.value, "Not enough money");

        for (uint256 i = 0; i < _amount; i += 1) {
            ursFactory.mint(msg.sender);
        }

        mintedURSOf[msg.sender] = mintedURS + _amount;
        newlyMintedURSWithPass += _amount;
        newlyMintedURS += _amount;

        // Refund changes
        uint256 changes = msg.value.sub(totalPrice);
        payable(msg.sender).transfer(changes);

        emit MintWithPass(msg.sender, _amount, changes);
    }

    function takingTickets(uint256 _amount) external payable whenOpened {
        ticket storage myTicket = ticketsOf[msg.sender];
        require(myTicket.amount == 0, "Already registered");

        uint256 totalPrice = ticketPrice.mul(_amount);
        require(totalPrice <= msg.value, "Not enough money");

        myTicket.index = totalTickets;
        myTicket.amount = _amount;

        totalTickets = totalTickets.add(_amount);

        // Refund changes
        uint256 changes = msg.value.sub(totalPrice);
        payable(msg.sender).transfer(changes);

        emit TakingTickets(msg.sender, _amount, changes);
    }

    function runRaffle(uint256 _raffleNumber) external onlyOwner {
        require(raffleNumber == 0, "raffle number is already set");

        raffleNumber = _raffleNumber;
        uint256 remainingURS = maxURS - preMintedURS - newlyMintedURSWithPass;

        slotSize = totalTickets.div(remainingURS);
        offsetInSlot = _raffleNumber.mod(slotSize);

        emit RunRaffle(_raffleNumber);
    }

    function checkMyResult() public {
        require(raffleNumber > 0, "raffle number is not set yet");
        ticket storage myTicket = ticketsOf[msg.sender];
        result storage myResult = resultOf[msg.sender];

        require(!myResult.executed, "Already checked");

        /**

        /_____fio___\___________________________________/lio\___________
                v   f |         v     |         v     |     l   v     |
        ______slot #n__|___slot #n+1___|____slot #n+2__|____slot #n+3__|

            f : first index (incl.)
            l : last index (incl.)
            v : win ticket
            fio : first index offset
            lio : last index offset
            n, n+1,... : slot index
            
            v in (slot #n+1) is ths firstWinIndex
            v in (slot #n+2) is ths lastWinIndex
        */

        uint256 lastIndex = myTicket.index + myTicket.amount - 1; // incl.

        uint256 firstIndexOffset = (myTicket.index).mod(slotSize);
        uint256 lastIndexOffset = (lastIndex).mod(slotSize);

        uint256 firstWinIndex;
        if (firstIndexOffset <= offsetInSlot) {
            firstWinIndex = myTicket.index - firstIndexOffset + offsetInSlot;
        } else {
            firstWinIndex =
                myTicket.index -
                firstIndexOffset +
                slotSize +
                offsetInSlot;
        }

        uint256 lastWinIndex;
        if (lastIndexOffset >= offsetInSlot) {
            lastWinIndex = lastIndex - lastIndexOffset + offsetInSlot;
        } else {
            lastWinIndex =
                lastIndex -
                lastIndexOffset +
                offsetInSlot -
                slotSize;
        }

        uint256 validTicketAmount = (lastWinIndex - firstWinIndex).div(
            slotSize
        ) + 1;

        myResult.validTicketAmount = validTicketAmount;
        myResult.executed = true;

        uint256 remainingTickets = myTicket.amount - validTicketAmount;
        uint256 changes = remainingTickets * ticketPrice;
        payable(msg.sender).transfer(changes);

        emit SetResult(msg.sender, validTicketAmount, changes);
    }

    function mintURS() external {
        result storage myResult = resultOf[msg.sender];

        require(myResult.executed, "result is not calculated yet");
        require(myResult.validTicketAmount > 0, "No valid tickets");

        uint256 mintRequestAmount = 0;

        if (myResult.validTicketAmount > maxMintPerTx) {
            mintRequestAmount = maxMintPerTx;
            myResult.validTicketAmount -= maxMintPerTx;
        } else {
            mintRequestAmount = myResult.validTicketAmount;
            myResult.validTicketAmount = 0;
        }

        for (uint256 i = 0; i < mintRequestAmount; i += 1) {
            ursFactory.mint(msg.sender);
        }

        newlyMintedURS += mintRequestAmount;

        emit MintURS(msg.sender, mintRequestAmount);
    }

    // withdraw eth for claimed URS tickets
    function withdraw(address _to) external onlyOwner {
        uint256 withdrawalAmount = newlyMintedURS * ticketPrice;

        // Send eth to designated receiver
        payable(_to).transfer(withdrawalAmount);

        claimedEth += withdrawalAmount;
        newlyMintedURS = 0;

        emit Withdraw();
    }
}
