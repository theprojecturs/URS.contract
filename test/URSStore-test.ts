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
const MAX_MINT_PER_TX = 20;
const TICKET_PRICE_IN_WEI = ethers.utils.parseEther('0.08');

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
  });

  describe('constructor', async () => {
    it('Should be initialized successfully', async () => {
      expect(await ursStoreContract.mintPass()).to.eq(EMPTY_ADDRESS);
      expect(await ursStoreContract.ursFactory()).to.eq(EMPTY_ADDRESS);
      expect(await ursStoreContract.owner()).to.eq(deployer.address);
      expect(await ursStoreContract.maxURS()).to.eq(MAX_SUPPLY);
      expect(await ursStoreContract.preMintedURS()).to.eq(0);
      expect(await ursStoreContract.maxPreMintURS()).to.eq(MAX_PRE_MINT_SUPPLY);
      expect(await ursStoreContract.newlyMintedURSWithPass()).to.eq(0);
      expect(await ursStoreContract.maxURSPerPass()).to.eq(MAX_URS_PER_PASS);
      expect(await ursStoreContract.openingHours()).to.eq(0);
      expect(await ursStoreContract.operationSecondsForVIP()).to.eq(3600 * 3);
      expect(await ursStoreContract.operationSeconds()).to.eq(3600 * 24);
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
      expect(await ursStoreContract.mintPass()).not.to.eq(
        mintPassContract.address
      );

      await ursStoreContract
        .connect(deployer)
        .setMintPass(mintPassContract.address);

      expect(await ursStoreContract.mintPass()).to.eq(mintPassContract.address);
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
      expect(await ursStoreContract.ursFactory()).not.to.eq(
        ursFactoryContract.address
      );

      await ursStoreContract
        .connect(deployer)
        .setURSFactory(ursFactoryContract.address);

      expect(await ursStoreContract.ursFactory()).to.eq(
        ursFactoryContract.address
      );
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
    beforeEach(async () => {
      await ursStoreContract.setURSFactory(ursFactoryContract.address);
      await ursFactoryContract.setURSStore(ursStoreContract.address);
    });

    it('fails if non-owner try to call', async () => {
      const nonOwner = account1;
      expect(await ursStoreContract.owner()).not.to.eq(nonOwner.address);

      await expect(
        ursStoreContract.connect(nonOwner).preMintURS(nonOwner.address)
      ).to.be.revertedWith('caller is not the owner');
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
});
