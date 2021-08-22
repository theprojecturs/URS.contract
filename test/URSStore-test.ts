import chai from 'chai';
import { ethers } from 'hardhat';
import {
  URSFactory,
  URSFactory__factory,
  URSStore,
  URSStore__factory,
  TestMintPass,
  TestMintPass__factory,
} from '../types';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { solidity } from 'ethereum-waffle';

chai.use(solidity);
const { expect } = chai;

const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000';
const MAX_SUPPLY = 10000;
const MAX_PRE_MINT_SUPPLY = 20;
const MAX_URS_PER_PASS = 20;
const MAX_MINT_PER_TX = 30;
const TICKET_PRICE_IN_WEI = ethers.utils.parseEther('0.08');
const OPERATION_SECONDS_FOR_VIP = 3600 * 3;
const OPERATION_SECONDS = 3600 * 24;

const configs = {
  name: 'test',
  symbol: 'tst',
  baseURI: 'test.com/',
};

describe('URSStore', () => {
  let [deployer, account1, account2]: SignerWithAddress[] = [];
  let mintPassContract: TestMintPass;
  let ursFactoryContract: URSFactory;
  let ursStoreContract: URSStore;

  const getCurrentTimestamp = async () => {
    const currentBlockNum = await ethers.provider.getBlockNumber();
    const currentBlock = await ethers.provider.getBlock(currentBlockNum);
    const currentTimestamp = currentBlock.timestamp;

    return currentTimestamp;
  };

  beforeEach(async () => {
    [deployer, account1, account2] = await ethers.getSigners();

    const MintPass = new TestMintPass__factory(deployer);
    mintPassContract = await MintPass.deploy(
      configs.name,
      configs.symbol,
      configs.baseURI
    );

    const URSFactory = new URSFactory__factory(deployer);
    ursFactoryContract = await URSFactory.deploy(
      configs.name,
      configs.symbol,
      configs.baseURI
    );

    const URSStore = new URSStore__factory(deployer);
    ursStoreContract = await URSStore.deploy();

    await ursFactoryContract.setURSStore(ursStoreContract.address);
    await ursStoreContract.setURSFactory(ursFactoryContract.address);
    await ursStoreContract.setMintPass(mintPassContract.address);
  });

  describe('constructor', async () => {
    it('Should be initialized successfully', async () => {
      expect(await ursStoreContract.mintPass()).to.eq(mintPassContract.address);
      expect(await ursStoreContract.ursFactory()).to.eq(
        ursFactoryContract.address
      );
      expect(await ursStoreContract.owner()).to.eq(deployer.address);
      expect(await ursStoreContract.maxURS()).to.eq(MAX_SUPPLY);
      expect(await ursStoreContract.preMintedURS()).to.eq(0);
      expect(await ursStoreContract.maxPreMintURS()).to.eq(MAX_PRE_MINT_SUPPLY);
      expect(await ursStoreContract.newlyMintedURSWithPass()).to.eq(0);
      expect(await ursStoreContract.maxURSPerPass()).to.eq(MAX_URS_PER_PASS);
      expect(await ursStoreContract.openingHours()).to.eq(0);
      expect(await ursStoreContract.operationSecondsForVIP()).to.eq(
        OPERATION_SECONDS_FOR_VIP
      );
      expect(await ursStoreContract.operationSeconds()).to.eq(
        OPERATION_SECONDS
      );
      expect(await ursStoreContract.ticketPrice()).to.eq(TICKET_PRICE_IN_WEI);
      expect(await ursStoreContract.totalTickets()).to.eq(0);
      expect(await ursStoreContract.maxMintPerTx()).to.eq(MAX_MINT_PER_TX);
      expect(await ursStoreContract.raffleNumber()).to.eq(0);
      expect(await ursStoreContract.offsetInSlot()).to.eq(0);
      expect(await ursStoreContract.slotSize()).to.eq(0);
      expect(await ursStoreContract.lastTargetIndex()).to.eq(0);
      expect(await ursStoreContract.mintedURSOf(deployer.address)).to.eq(0);

      const ticket = await ursStoreContract.ticketsOf(deployer.address);
      expect(ticket[0]).to.eq(0);
      expect(ticket[1]).to.eq(0);

      const result = await ursStoreContract.resultOf(deployer.address);
      expect(result[0]).to.eq(false);
      expect(result[1]).to.eq(0);
    });
  });

  describe('setMintPass', async () => {
    it('fails if non-owner try to call', async () => {
      const nonOwner = account1;
      expect(await ursStoreContract.owner()).not.to.eq(nonOwner.address);

      await expect(
        ursStoreContract.connect(nonOwner).setMintPass(mintPassContract.address)
      ).to.be.revertedWith('caller is not the owner');
    });

    it('changes mintPass address', async () => {
      const newMintPassAddress = account1.address;
      expect(await ursStoreContract.mintPass()).not.to.eq(newMintPassAddress);

      await ursStoreContract.connect(deployer).setMintPass(newMintPassAddress);

      expect(await ursStoreContract.mintPass()).to.eq(newMintPassAddress);
    });

    it("emits 'SetMintPass' event", async () => {
      await expect(
        ursStoreContract.connect(deployer).setMintPass(mintPassContract.address)
      )
        .to.emit(ursStoreContract, 'SetMintPass')
        .withArgs(mintPassContract.address);
    });
  });

  describe('setURSFactory', async () => {
    it('fails if non-owner try to call', async () => {
      const nonOwner = account1;
      expect(await ursStoreContract.owner()).not.to.eq(nonOwner.address);

      await expect(
        ursStoreContract
          .connect(nonOwner)
          .setURSFactory(ursFactoryContract.address)
      ).to.be.revertedWith('caller is not the owner');
    });

    it('changes ursFactory address', async () => {
      const newURSFactoryAddress = account1.address;

      expect(await ursStoreContract.ursFactory()).not.to.eq(
        newURSFactoryAddress
      );

      await ursStoreContract
        .connect(deployer)
        .setURSFactory(newURSFactoryAddress);

      expect(await ursStoreContract.ursFactory()).to.eq(newURSFactoryAddress);
    });

    it("emits 'SetURSFactory' event", async () => {
      await expect(
        ursStoreContract
          .connect(deployer)
          .setURSFactory(ursFactoryContract.address)
      )
        .to.emit(ursStoreContract, 'SetURSFactory')
        .withArgs(ursFactoryContract.address);
    });
  });

  describe('setOpeningHours', async () => {
    const testOpeningHours = 1000;

    it('fails if non-owner try to call', async () => {
      const nonOwner = account1;
      expect(await ursStoreContract.owner()).not.to.eq(nonOwner.address);

      await expect(
        ursStoreContract.connect(nonOwner).setOpeningHours(testOpeningHours)
      ).to.be.revertedWith('caller is not the owner');
    });

    it('changes openingHours', async () => {
      expect(await ursStoreContract.openingHours()).not.to.eq(testOpeningHours);

      await ursStoreContract
        .connect(deployer)
        .setOpeningHours(testOpeningHours);

      expect(await ursStoreContract.openingHours()).to.eq(testOpeningHours);
    });

    it("emits 'SetOpeningHours' event", async () => {
      await expect(
        ursStoreContract.connect(deployer).setOpeningHours(testOpeningHours)
      )
        .to.emit(ursStoreContract, 'SetOpeningHours')
        .withArgs(testOpeningHours);
    });
  });

  describe('preMintURS', async () => {
    let openingHours = 0;

    beforeEach(async () => {
      openingHours = await getCurrentTimestamp();
      await ursStoreContract.setOpeningHours(openingHours);
    });

    it('fails if non-owner try to call', async () => {
      const nonOwner = account1;
      expect(await ursStoreContract.owner()).not.to.eq(nonOwner.address);

      await expect(
        ursStoreContract.connect(nonOwner).preMintURS(nonOwner.address)
      ).to.be.revertedWith('caller is not the owner');
    });

    it('fails if ticketing period is over', async () => {
      const closingHours =
        openingHours + OPERATION_SECONDS_FOR_VIP + OPERATION_SECONDS;

      let currentBlockNum = await ethers.provider.getBlockNumber();
      let currentBlock = await ethers.provider.getBlock(currentBlockNum);
      let currentTimestamp = currentBlock.timestamp;
      expect(currentTimestamp).to.lt(closingHours);

      await expect(ursStoreContract.preMintURS(deployer.address)).not.to.be
        .reverted;

      await ethers.provider.send('evm_increaseTime', [closingHours + 1]);
      await ethers.provider.send('evm_mine', []);

      currentBlockNum = await ethers.provider.getBlockNumber();
      currentBlock = await ethers.provider.getBlock(currentBlockNum);
      currentTimestamp = currentBlock.timestamp;
      expect(currentTimestamp).to.gt(closingHours);

      await expect(
        ursStoreContract.preMintURS(deployer.address)
      ).to.be.revertedWith('Not available after ticketing period');
    });

    it('mints one URS to receiver', async () => {
      const receiver = account1;
      const balanceOfReceiver = await ursFactoryContract.balanceOf(
        receiver.address
      );
      const preMintedURSAmount = await ursStoreContract.preMintedURS();

      await ursStoreContract.connect(deployer).preMintURS(receiver.address);
      expect(await ursFactoryContract.balanceOf(receiver.address)).to.eq(
        balanceOfReceiver.toNumber() + 1
      );
      expect(await ursStoreContract.preMintedURS()).to.eq(
        preMintedURSAmount.toNumber() + 1
      );
    });

    it('fails after maxPreMintedURS number', async () => {
      const receiver = account1;
      const tasks = Promise.all(
        new Array(MAX_PRE_MINT_SUPPLY + 1)
          .fill(null)
          .map(() =>
            ursStoreContract.connect(deployer).preMintURS(receiver.address)
          )
      );

      await expect(tasks).to.be.revertedWith('Exceeds max pre-mint URS');
    });
  });

  describe('mintWithPass', async () => {
    let openingHours = 0;

    beforeEach(async () => {
      openingHours = await getCurrentTimestamp();
      await ursStoreContract.setOpeningHours(openingHours);
    });

    it('fails if store is not opened', async () => {
      await ursStoreContract.setOpeningHours(openingHours + 24 * 3600);

      await expect(ursStoreContract.mintWithPass(1)).to.be.revertedWith(
        'Store is not opened for VIP'
      );
    });

    it('fails if vip time is over', async () => {
      await ursStoreContract.setOpeningHours(0);

      await expect(ursStoreContract.mintWithPass(1)).to.be.revertedWith(
        'Store is closed for VIP'
      );
    });

    it('fails if mint amount exceeds maxMintPerTx', async () => {
      await expect(
        ursStoreContract.mintWithPass(MAX_MINT_PER_TX + 1)
      ).to.be.revertedWith('mint amount exceeds maximum');
    });

    it('fails if user does not hold any mintPass', async () => {
      const receiver = account1;
      expect(await mintPassContract.balanceOf(receiver.address)).to.eq(0);

      await expect(ursStoreContract.mintWithPass(1)).to.be.revertedWith(
        'Not enough Pass'
      );
    });

    it('fails for zero amount', async () => {
      await expect(ursStoreContract.mintWithPass(0)).to.be.revertedWith(
        'Need to mint more than 0'
      );
    });

    it('fails if mint amount exceeds allowed quantity (mintPass qty)', async () => {
      const receiver = account1;

      await mintPassContract.mint(receiver.address, 0);
      expect(await mintPassContract.balanceOf(receiver.address)).to.eq(1);

      await expect(
        ursStoreContract.connect(receiver).mintWithPass(MAX_URS_PER_PASS + 1)
      ).to.be.revertedWith('Not enough Pass');
    });

    it('fails if zero ether is sent', async () => {
      const receiver = account1;

      await mintPassContract.mint(receiver.address, 0);
      expect(await mintPassContract.balanceOf(receiver.address)).to.eq(1);

      await expect(
        ursStoreContract.connect(receiver).mintWithPass(1)
      ).to.be.revertedWith('Not enough money');
    });

    it('fails if not enough ether is sent', async () => {
      const receiver = account1;
      const amount = 3;
      const totalPrice = TICKET_PRICE_IN_WEI.mul(amount);

      await mintPassContract.mint(receiver.address, 0);
      expect(await mintPassContract.balanceOf(receiver.address)).to.eq(1);

      await expect(
        ursStoreContract
          .connect(receiver)
          .mintWithPass(amount, { value: totalPrice.sub(1) })
      ).to.be.revertedWith('Not enough money');
    });

    it('mints requested amount to message sender', async () => {
      const receiver = account1;
      const amount = 3;
      const totalPrice = TICKET_PRICE_IN_WEI.mul(amount);

      await mintPassContract.mint(receiver.address, 0);
      expect(await mintPassContract.balanceOf(receiver.address)).to.eq(1);

      const mintedAmount = await ursStoreContract.mintedURSOf(receiver.address);
      const newlyMintedURSWithPass =
        await ursStoreContract.newlyMintedURSWithPass();

      await ursStoreContract
        .connect(receiver)
        .mintWithPass(amount, { value: totalPrice });

      expect(await ursStoreContract.mintedURSOf(receiver.address)).to.eq(
        mintedAmount.toNumber() + amount
      );
      expect(await ursStoreContract.newlyMintedURSWithPass()).to.eq(
        newlyMintedURSWithPass.toNumber() + amount
      );
    });

    it('mints multiple until reaches max available amount', async () => {
      const receiver = account1;
      const amount = MAX_URS_PER_PASS;
      const totalPrice = TICKET_PRICE_IN_WEI.mul(amount);

      await mintPassContract.mint(receiver.address, 0);
      await mintPassContract.mint(receiver.address, 1);
      expect(await mintPassContract.balanceOf(receiver.address)).to.eq(2);

      const mintedAmount = await ursStoreContract.mintedURSOf(receiver.address);
      const newlyMintedURSWithPass =
        await ursStoreContract.newlyMintedURSWithPass();

      await ursStoreContract
        .connect(receiver)
        .mintWithPass(amount, { value: totalPrice });

      expect(await ursStoreContract.mintedURSOf(receiver.address)).to.eq(
        mintedAmount.toNumber() + amount
      );
      expect(await ursStoreContract.newlyMintedURSWithPass()).to.eq(
        newlyMintedURSWithPass.toNumber() + amount
      );

      await ursStoreContract
        .connect(receiver)
        .mintWithPass(amount, { value: totalPrice });

      expect(await ursStoreContract.mintedURSOf(receiver.address)).to.eq(
        mintedAmount.toNumber() + amount * 2
      );
      expect(await ursStoreContract.newlyMintedURSWithPass()).to.eq(
        newlyMintedURSWithPass.toNumber() + amount * 2
      );
    });

    it("accumulate received ether in it's contract", async () => {
      const receiver = account1;
      const amount = MAX_URS_PER_PASS;
      const totalPrice = TICKET_PRICE_IN_WEI.mul(amount);

      await mintPassContract.mint(receiver.address, 0);

      const ethBalanceOfContract = await ethers.provider.getBalance(
        ursStoreContract.address
      );

      await ursStoreContract
        .connect(receiver)
        .mintWithPass(amount, { value: totalPrice });

      expect(await ethers.provider.getBalance(ursStoreContract.address)).to.eq(
        ethBalanceOfContract.add(totalPrice)
      );
    });

    it('returns changes', async () => {
      const receiver = account1;
      const amount = MAX_URS_PER_PASS;
      const extraAmountInWei = 100;
      const totalPrice = TICKET_PRICE_IN_WEI.mul(amount);

      await mintPassContract.mint(receiver.address, 0);

      const ethBalanceOfContract = await ethers.provider.getBalance(
        ursStoreContract.address
      );
      const ethBalanceOfReceiver = await ethers.provider.getBalance(
        receiver.address
      );

      await ursStoreContract.connect(receiver).mintWithPass(amount, {
        value: totalPrice.add(extraAmountInWei),
        gasPrice: 0,
      });

      expect(await ethers.provider.getBalance(ursStoreContract.address)).to.eq(
        ethBalanceOfContract.add(totalPrice)
      );
      expect(await ethers.provider.getBalance(receiver.address)).to.eq(
        ethBalanceOfReceiver.sub(totalPrice)
      );
    });

    it("emits 'MintWithPass' event", async () => {
      const receiver = account1;
      const amount = 1;
      const totalPrice = TICKET_PRICE_IN_WEI;

      await mintPassContract.mint(receiver.address, 0);

      await expect(
        ursStoreContract
          .connect(receiver)
          .mintWithPass(amount, { value: totalPrice })
      )
        .to.emit(ursStoreContract, 'MintWithPass')
        .withArgs(receiver.address, amount, 0);

      const changes = 100;
      await expect(
        ursStoreContract
          .connect(receiver)
          .mintWithPass(amount, { value: totalPrice.add(changes) })
      )
        .to.emit(ursStoreContract, 'MintWithPass')
        .withArgs(receiver.address, amount, changes);
    });
  });

  describe('takingTickets', async () => {
    beforeEach(async () => {
      const openingHours = await getCurrentTimestamp();
      await ursStoreContract.setOpeningHours(openingHours);
      await ethers.provider.send('evm_increaseTime', [
        OPERATION_SECONDS_FOR_VIP + 1,
      ]);
      await ethers.provider.send('evm_mine', []);
    });

    it('fails when store is not opened yet', async () => {
      const openingHours = await getCurrentTimestamp();
      await ursStoreContract.setOpeningHours(openingHours + 7 * 24 * 3600);

      await expect(ursStoreContract.takingTickets(1)).to.be.revertedWith(
        'Store is not opened'
      );
    });

    it('fails when store is opened only for VIP', async () => {
      const openingHours = await getCurrentTimestamp();
      await ursStoreContract.setOpeningHours(openingHours);
      await ethers.provider.send('evm_increaseTime', [
        OPERATION_SECONDS_FOR_VIP / 2,
      ]);
      await ethers.provider.send('evm_mine', []);

      await expect(ursStoreContract.takingTickets(1)).to.be.revertedWith(
        'Store is not opened'
      );
    });

    it('fails when store is closed', async () => {
      const openingHours = await getCurrentTimestamp();
      await ursStoreContract.setOpeningHours(openingHours);
      await ethers.provider.send('evm_increaseTime', [
        OPERATION_SECONDS_FOR_VIP + OPERATION_SECONDS + 1,
      ]);
      await ethers.provider.send('evm_mine', []);

      await expect(ursStoreContract.takingTickets(1)).to.be.revertedWith(
        'Store is closed'
      );
    });

    it('fails when requestedAmount is zero', async () => {
      await expect(ursStoreContract.takingTickets(0)).to.be.revertedWith(
        'Need to take ticket more than 0'
      );
    });

    it('fails if user already has taken tickets', async () => {
      const amount = 1;
      const totalPrice = TICKET_PRICE_IN_WEI.mul(amount);
      const taker = account1;

      await expect(
        ursStoreContract
          .connect(taker)
          .takingTickets(amount, { value: totalPrice })
      ).not.to.be.reverted;

      await expect(
        ursStoreContract
          .connect(taker)
          .takingTickets(amount, { value: totalPrice })
      ).to.be.revertedWith('Already registered');
    });

    it('fails if user sends not enough eth', async () => {
      const amount = 10;
      const totalPrice = TICKET_PRICE_IN_WEI.mul(amount);
      const taker = account1;

      await expect(
        ursStoreContract
          .connect(taker)
          .takingTickets(amount, { value: totalPrice.sub(1) })
      ).to.be.revertedWith('Not enough money');
    });

    it('change several status', async () => {
      const amount = 10;
      const totalPrice = TICKET_PRICE_IN_WEI.mul(amount);
      const taker = account1;

      const ticketsBefore = await ursStoreContract.ticketsOf(taker.address);
      const totalTicketsBefore = await ursStoreContract.totalTickets();
      expect(ticketsBefore.index).to.eq(0);
      expect(ticketsBefore.amount).to.eq(0);

      await ursStoreContract
        .connect(taker)
        .takingTickets(amount, { value: totalPrice });

      const ticketsAfter = await ursStoreContract.ticketsOf(taker.address);
      const totalTicketsAfter = await ursStoreContract.totalTickets();

      expect(ticketsAfter.index).to.eq(totalTicketsBefore);
      expect(ticketsAfter.amount).to.eq(amount);
      expect(totalTicketsAfter).to.eq(totalTicketsBefore.add(amount));
    });

    it('accumulates totalPrice eth to the contract', async () => {
      const amount = 10;
      const totalPrice = TICKET_PRICE_IN_WEI.mul(amount);
      const taker = account1;

      const ethBalanceOfContract = await ethers.provider.getBalance(
        ursStoreContract.address
      );

      await ursStoreContract
        .connect(taker)
        .takingTickets(amount, { value: totalPrice });

      expect(await ethers.provider.getBalance(ursStoreContract.address)).to.eq(
        ethBalanceOfContract.add(totalPrice)
      );
    });

    it('returns changes', async () => {
      const amount = 10;
      const totalPrice = TICKET_PRICE_IN_WEI.mul(amount);
      const taker = account1;

      const ethBalanceOfContractBefore = await ethers.provider.getBalance(
        ursStoreContract.address
      );
      const ethBalanceOfTakerBefore = await ethers.provider.getBalance(
        taker.address
      );

      await ursStoreContract
        .connect(taker)
        .takingTickets(amount, { value: totalPrice.add(1), gasPrice: 0 });

      const ethBalanceOfContractAfter = await ethers.provider.getBalance(
        ursStoreContract.address
      );
      const ethBalanceOfTakerAfter = await ethers.provider.getBalance(
        taker.address
      );

      expect(ethBalanceOfContractAfter).to.eq(
        ethBalanceOfContractBefore.add(totalPrice)
      );
      expect(ethBalanceOfTakerAfter).to.eq(
        ethBalanceOfTakerBefore.sub(totalPrice)
      );
    });

    it("emit 'TakingTickets' event", async () => {
      const amount = 10;
      const totalPrice = TICKET_PRICE_IN_WEI.mul(amount);
      const taker = account1;
      const changes = 1;

      await expect(
        ursStoreContract
          .connect(taker)
          .takingTickets(amount, { value: totalPrice.add(changes) })
      )
        .to.emit(ursStoreContract, 'TakingTickets')
        .withArgs(taker.address, amount, changes);
    });
  });

  describe('runRaffle', async () => {
    beforeEach(async () => {
      const openingHours = await getCurrentTimestamp();
      await ursStoreContract.setOpeningHours(openingHours);
      await ethers.provider.send('evm_increaseTime', [
        OPERATION_SECONDS_FOR_VIP + OPERATION_SECONDS / 2,
      ]);
      await ethers.provider.send('evm_mine', []);

      const ticketAmount = MAX_SUPPLY;
      await ursStoreContract.takingTickets(ticketAmount, {
        value: TICKET_PRICE_IN_WEI.mul(MAX_SUPPLY),
      });
    });

    it("fails for non-owner's request", async () => {
      const nonOwner = account1;

      await expect(
        ursStoreContract.connect(nonOwner).runRaffle(1)
      ).to.be.revertedWith('caller is not the owner');
    });

    it('fails if raffleNumber already set', async () => {
      await expect(ursStoreContract.runRaffle(1)).not.to.be.reverted;
      await expect(ursStoreContract.runRaffle(1)).to.be.revertedWith(
        'raffle number is already set'
      );
    });

    it("emits 'RunRaffle' event", async () => {
      const raffleNumber = 5;
      await expect(ursStoreContract.runRaffle(raffleNumber))
        .to.emit(ursStoreContract, 'RunRaffle')
        .withArgs(raffleNumber);
    });
  });

  describe('checkMyResult', async () => {
    let ticketHolder: SignerWithAddress;

    beforeEach(async () => {
      const openingHours = await getCurrentTimestamp();
      await ursStoreContract.setOpeningHours(openingHours);
      await ethers.provider.send('evm_increaseTime', [
        OPERATION_SECONDS_FOR_VIP + OPERATION_SECONDS / 2,
      ]);
      await ethers.provider.send('evm_mine', []);

      ticketHolder = deployer;
      const ticketAmount = MAX_SUPPLY;
      await ursStoreContract.connect(deployer).takingTickets(ticketAmount, {
        value: TICKET_PRICE_IN_WEI.mul(MAX_SUPPLY),
      });
    });

    it('fails if raffleNumber is not set', async () => {
      await expect(ursStoreContract.checkMyResult()).to.be.revertedWith(
        'raffle number is not set yet'
      );
    });

    it('fails if ticket amount is zero', async () => {
      const taker = account1;

      const myTickets = await ursStoreContract.ticketsOf(taker.address);
      expect(myTickets.amount).to.eq(0);

      await ursStoreContract.runRaffle(5);
      await expect(
        ursStoreContract.connect(taker).checkMyResult()
      ).to.be.revertedWith('No available ticket');
    });

    it('fails if user has already checked', async () => {
      const myTickets = await ursStoreContract.ticketsOf(ticketHolder.address);
      expect(myTickets.amount).not.to.eq(0);

      await ursStoreContract.runRaffle(5);
      await expect(ursStoreContract.connect(ticketHolder).checkMyResult()).not
        .to.be.reverted;

      await expect(
        ursStoreContract.connect(ticketHolder).checkMyResult()
      ).to.be.revertedWith('Already checked');
    });

    it('returns changes', async () => {
      const taker = account1;

      // It can not be picked because 'ticketHolder' already picked MAX_SUPPLY
      const ticketAmount = 1;
      const totalPrice = TICKET_PRICE_IN_WEI.mul(ticketAmount);
      await ursStoreContract.connect(taker).takingTickets(ticketAmount, {
        value: totalPrice,
      });

      const myTickets = await ursStoreContract.ticketsOf(taker.address);
      expect(myTickets.amount).to.eq(ticketAmount);

      const ethBalanceOfContractBefore = await ethers.provider.getBalance(
        ursStoreContract.address
      );
      const ethBalanceOfTakerBefore = await ethers.provider.getBalance(
        taker.address
      );

      await ursStoreContract.runRaffle(5);
      await expect(
        ursStoreContract.connect(taker).checkMyResult({ gasPrice: 0 })
      ).not.to.be.reverted;

      const ethBalanceOfContractAfter = await ethers.provider.getBalance(
        ursStoreContract.address
      );
      const ethBalanceOfTakerAfter = await ethers.provider.getBalance(
        taker.address
      );
      expect(ethBalanceOfContractAfter).to.eq(
        ethBalanceOfContractBefore.sub(totalPrice)
      );
      expect(ethBalanceOfTakerAfter).to.eq(
        ethBalanceOfTakerBefore.add(totalPrice)
      );
    });

    it("emits 'SetResult' event", async () => {
      const taker = account1;
      const ticketAmount = 1;
      const totalPrice = TICKET_PRICE_IN_WEI.mul(ticketAmount);
      await ursStoreContract.connect(taker).takingTickets(ticketAmount, {
        value: totalPrice,
      });

      await ursStoreContract.runRaffle(5);
      await expect(ursStoreContract.connect(taker).checkMyResult())
        .to.emit(ursStoreContract, 'SetResult')
        .withArgs(taker.address, 0, totalPrice);
    });
  });

  describe('mintURS', async () => {
    let firstTwoTicketsHolder: SignerWithAddress;
    let allTicketsHolder: SignerWithAddress;
    let invalidTicketHolder: SignerWithAddress;

    beforeEach(async () => {
      const openingHours = await getCurrentTimestamp();
      await ursStoreContract.setOpeningHours(openingHours);
      await ethers.provider.send('evm_increaseTime', [
        OPERATION_SECONDS_FOR_VIP + OPERATION_SECONDS / 2,
      ]);
      await ethers.provider.send('evm_mine', []);

      firstTwoTicketsHolder = account1;
      allTicketsHolder = deployer;
      invalidTicketHolder = account2;

      const twoTickets = 2;
      await ursStoreContract
        .connect(firstTwoTicketsHolder)
        .takingTickets(twoTickets, {
          value: TICKET_PRICE_IN_WEI.mul(twoTickets),
        });

      const ticketAmount = MAX_SUPPLY - twoTickets;
      await ursStoreContract
        .connect(allTicketsHolder)
        .takingTickets(ticketAmount, {
          value: TICKET_PRICE_IN_WEI.mul(ticketAmount),
        });

      const invalidTicket = 1;
      await ursStoreContract
        .connect(invalidTicketHolder)
        .takingTickets(invalidTicket, {
          value: TICKET_PRICE_IN_WEI.mul(invalidTicket),
        });

      await ursStoreContract.connect(deployer).runRaffle(1);
    });

    it("fails if user did not run 'checkMyResult' before", async () => {
      await expect(ursStoreContract.mintURS()).to.be.revertedWith(
        'result is not calculated yet'
      );
    });

    it('fails if user does not hold any valid ticket', async () => {
      await ursStoreContract.connect(invalidTicketHolder).checkMyResult();

      await expect(
        ursStoreContract.connect(invalidTicketHolder).mintURS()
      ).to.be.revertedWith('No valid tickets');
    });

    it('mints maxMintPerTx if validTicketAmount exceeds maxMintPerTx', async () => {
      await ursStoreContract.connect(allTicketsHolder).checkMyResult();

      const ursBalanceBefore = await ursFactoryContract.balanceOf(
        allTicketsHolder.address
      );
      expect(ursBalanceBefore).to.eq(0);

      const resultsBefore = await ursStoreContract.resultOf(
        allTicketsHolder.address
      );
      const validTicketAmountBefore = resultsBefore.validTicketAmount;

      await ursStoreContract.connect(allTicketsHolder).mintURS();

      const ursBalanceAfter = await ursFactoryContract.balanceOf(
        allTicketsHolder.address
      );
      expect(ursBalanceAfter).to.eq(MAX_MINT_PER_TX);

      const resultsAfter = await ursStoreContract.resultOf(
        allTicketsHolder.address
      );
      expect(resultsAfter.validTicketAmount).to.eq(
        validTicketAmountBefore.sub(MAX_MINT_PER_TX)
      );
    });

    it('mints all if validTicketAmount does not exceed maxMintPerTx', async () => {
      await ursStoreContract.connect(firstTwoTicketsHolder).checkMyResult();
      const amount = 2;

      const ursBalanceBefore = await ursFactoryContract.balanceOf(
        firstTwoTicketsHolder.address
      );
      expect(ursBalanceBefore).to.eq(0);

      const resultsBefore = await ursStoreContract.resultOf(
        firstTwoTicketsHolder.address
      );
      expect(resultsBefore.validTicketAmount).to.eq(2);

      await ursStoreContract.connect(firstTwoTicketsHolder).mintURS();

      const ursBalanceAfter = await ursFactoryContract.balanceOf(
        firstTwoTicketsHolder.address
      );
      expect(ursBalanceAfter).to.eq(amount);

      const resultsAfter = await ursStoreContract.resultOf(
        firstTwoTicketsHolder.address
      );
      expect(resultsAfter.validTicketAmount).to.eq(0);
    });

    it("emits 'MintURS' event", async () => {
      await ursStoreContract.connect(firstTwoTicketsHolder).checkMyResult();

      const amount = 2;
      await expect(ursStoreContract.connect(firstTwoTicketsHolder).mintURS())
        .to.emit(ursStoreContract, 'MintURS')
        .withArgs(firstTwoTicketsHolder.address, amount);

      await ursStoreContract.connect(allTicketsHolder).checkMyResult();

      await expect(ursStoreContract.connect(allTicketsHolder).mintURS())
        .to.emit(ursStoreContract, 'MintURS')
        .withArgs(allTicketsHolder.address, MAX_MINT_PER_TX);
    });
  });

  describe('withdraw', async () => {
    it("fails for non-owner's request", async () => {
      const nonOwner = account1;

      await expect(
        ursStoreContract.connect(nonOwner).withdraw(nonOwner.address)
      ).to.be.revertedWith('caller is not the owner');
    });

    it('sends nothing if newlyMintedURS is zero', async () => {
      const emptyAddressBalanceBefore = await ethers.provider.getBalance(
        EMPTY_ADDRESS
      );

      await expect(ursStoreContract.connect(deployer).withdraw(EMPTY_ADDRESS))
        .not.to.be.reverted;

      const emptyAddressBalanceAfter = await ethers.provider.getBalance(
        EMPTY_ADDRESS
      );
      expect(emptyAddressBalanceAfter).to.eq(emptyAddressBalanceBefore);
    });

    it('sends appropriate eth value', async () => {
      const openingHours = await getCurrentTimestamp();
      await ursStoreContract.setOpeningHours(openingHours);
      await ethers.provider.send('evm_increaseTime', [
        OPERATION_SECONDS_FOR_VIP + OPERATION_SECONDS / 2,
      ]);
      await ethers.provider.send('evm_mine', []);

      const newURSAmount = 5;
      const ursHolder = account1;

      await ursStoreContract.connect(ursHolder).takingTickets(newURSAmount, {
        value: TICKET_PRICE_IN_WEI.mul(newURSAmount),
      });

      await ursStoreContract.connect(deployer).takingTickets(MAX_SUPPLY, {
        value: TICKET_PRICE_IN_WEI.mul(MAX_SUPPLY),
      });

      await ursStoreContract.connect(deployer).runRaffle(1);

      await ursStoreContract.connect(ursHolder).checkMyResult();
      await ursStoreContract.connect(ursHolder).mintURS();

      const emptyAddressBalanceBefore = await ethers.provider.getBalance(
        EMPTY_ADDRESS
      );

      await expect(ursStoreContract.connect(deployer).withdraw(EMPTY_ADDRESS))
        .not.to.be.reverted;

      const emptyAddressBalanceAfter = await ethers.provider.getBalance(
        EMPTY_ADDRESS
      );
      expect(emptyAddressBalanceAfter).to.eq(
        emptyAddressBalanceBefore.add(TICKET_PRICE_IN_WEI.mul(newURSAmount))
      );
    });

    it("emits 'Withdraw' event", async () => {
      await expect(ursStoreContract.withdraw(deployer.address)).to.emit(
        ursStoreContract,
        'Withdraw'
      );
    });
  });

  describe('calculation test', async () => {
    const prepareEnvironments = async ({
      preMintedURS,
      newlyMintedURSWithPass,
      totalTickets,
      raffleNumber,
    }: {
      preMintedURS: number;
      newlyMintedURSWithPass: number;
      totalTickets: number;
      raffleNumber: number;
    }): Promise<void> => {
      const preMintTasks = new Array(preMintedURS)
        .fill(null)
        .map(() => ursStoreContract.preMintURS(EMPTY_ADDRESS));
      await Promise.all(preMintTasks);

      const openingHours = await getCurrentTimestamp();
      await ursStoreContract.setOpeningHours(openingHours);
      await ethers.provider.send('evm_increaseTime', [
        OPERATION_SECONDS_FOR_VIP / 2,
      ]);
      await ethers.provider.send('evm_mine', []);

      const passHolder = account1;
      let requiredMintPassAmount = Math.ceil(
        newlyMintedURSWithPass / MAX_URS_PER_PASS
      );
      let requiredMintWithPassTxAmount = Math.ceil(
        newlyMintedURSWithPass / MAX_MINT_PER_TX
      );

      const mintMintPassTasks = new Array(requiredMintPassAmount)
        .fill(null)
        .map((_, i) => mintPassContract.mint(passHolder.address, i));
      await Promise.all(mintMintPassTasks);

      const mintWithPassTasks = new Array(requiredMintWithPassTxAmount)
        .fill(null)
        .map((_, i) => {
          const amount =
            i + 1 === requiredMintWithPassTxAmount
              ? newlyMintedURSWithPass % MAX_MINT_PER_TX
              : MAX_MINT_PER_TX;
          const totalPrice = TICKET_PRICE_IN_WEI.mul(amount);
          return ursStoreContract
            .connect(passHolder)
            .mintWithPass(amount, { value: totalPrice });
        });
      await Promise.all(mintWithPassTasks);

      await ethers.provider.send('evm_increaseTime', [
        OPERATION_SECONDS_FOR_VIP / 2 + 1,
      ]);
      await ethers.provider.send('evm_mine', []);

      await ursStoreContract.takingTickets(totalTickets, {
        value: TICKET_PRICE_IN_WEI.mul(totalTickets),
      });

      await ursStoreContract.runRaffle(raffleNumber);
    };

    interface TestSet {
      preMintedURS: number;
      newlyMintedURSWithPass: number;
      totalTickets: number;
      raffleNumber: number;
      slotSizeExpected: number;
      offsetInSlotExpected: number;
      lastTargetIndexExpected: number;
    }
    const testSets: TestSet[] = [
      {
        preMintedURS: 0,
        newlyMintedURSWithPass: 0,
        totalTickets: 10000,
        raffleNumber: 1,
        slotSizeExpected: 1,
        offsetInSlotExpected: 0,
        lastTargetIndexExpected: 9999,
      },
      {
        preMintedURS: 0,
        newlyMintedURSWithPass: 5,
        totalTickets: 10000,
        raffleNumber: 1,
        slotSizeExpected: 1,
        offsetInSlotExpected: 0,
        lastTargetIndexExpected: 9994,
      },
      {
        preMintedURS: 0,
        newlyMintedURSWithPass: 0,
        totalTickets: 20000,
        raffleNumber: 2,
        slotSizeExpected: 2,
        offsetInSlotExpected: 0,
        lastTargetIndexExpected: 19999,
      },
    ];

    const testSetForPrint = (testSet: TestSet) => {
      return Object.keys(testSet).reduce(
        (acc, v) => `${acc}, ${v}: ${testSet[v as keyof TestSet]}`,
        ''
      );
    };

    await Promise.all(
      testSets.map((testSet) => {
        it(testSetForPrint(testSet), async () => {
          await prepareEnvironments({
            ...testSet,
          });

          expect(await ursStoreContract.slotSize()).to.eq(
            testSet.slotSizeExpected
          );
          expect(await ursStoreContract.offsetInSlot()).to.eq(
            testSet.offsetInSlotExpected
          );
          expect(await ursStoreContract.lastTargetIndex()).to.eq(
            testSet.lastTargetIndexExpected
          );
        });
      })
    );
  });
});
