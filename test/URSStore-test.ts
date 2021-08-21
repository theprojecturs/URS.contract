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
  let [deployer, account1]: SignerWithAddress[] = [];
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
    [deployer, account1] = await ethers.getSigners();

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
});
