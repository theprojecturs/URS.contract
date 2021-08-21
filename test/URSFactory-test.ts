import chai from 'chai';
import { ethers } from 'hardhat';
import {
  URSFactory,
  URSFactory__factory,
  TestURSStore,
  TestURSStore__factory,
} from '../types';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { solidity } from 'ethereum-waffle';

chai.use(solidity);
const { expect } = chai;

const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000';
const MAX_SUPPLY = 10000;

const configs = {
  name: 'test',
  symbol: 'tst',
  baseURI: 'test.com/',
};

describe('URSFactory', () => {
  let [deployer, account1]: SignerWithAddress[] = [];
  let ursFactoryContract: URSFactory;
  let ursStoreContract: TestURSStore;

  beforeEach(async () => {
    [deployer, account1] = await ethers.getSigners();
    const URSFactory = new URSFactory__factory(deployer);
    ursFactoryContract = await URSFactory.deploy(
      configs.name,
      configs.symbol,
      configs.baseURI
    );

    const URSStore = new TestURSStore__factory(deployer);
    ursStoreContract = await URSStore.deploy(ursFactoryContract.address);
  });

  describe('constructor', async () => {
    it('Should be initialized successfully', async () => {
      expect(await ursFactoryContract.baseURI()).to.eq(configs.baseURI);
      expect(await ursFactoryContract.baseURI()).to.eq(configs.baseURI);
      expect(await ursFactoryContract.MAX_SUPPLY()).to.eq(MAX_SUPPLY);
      expect(await ursFactoryContract.totalSupply()).to.eq(0);
      expect(await ursFactoryContract.owner()).to.eq(deployer.address);
      expect(await ursFactoryContract.ursStore()).to.eq(EMPTY_ADDRESS);
      expect(await ursFactoryContract.name()).to.eq(configs.name);
      expect(await ursFactoryContract.symbol()).to.eq(configs.symbol);
    });
  });

  describe('setURSStore', async () => {
    it("fails for nonOwner's request", async () => {
      const nonOwner = account1;
      await expect(
        ursFactoryContract
          .connect(nonOwner)
          .setURSStore(ursStoreContract.address)
      ).to.be.revertedWith('caller is not ther owner');
    });

    it('sets URSStore', async () => {
      let currentURSStoreAddress = await ursFactoryContract.ursStore();
      expect(currentURSStoreAddress).to.eq(EMPTY_ADDRESS);

      await ursFactoryContract
        .connect(deployer)
        .setURSStore(ursStoreContract.address);
      currentURSStoreAddress = await ursFactoryContract.ursStore();
      expect(currentURSStoreAddress).to.eq(ursStoreContract.address);
    });

    it("emits 'SetURSStore' event", async () => {
      await expect(
        ursFactoryContract
          .connect(deployer)
          .setURSStore(ursStoreContract.address)
      )
        .to.emit(ursFactoryContract, 'SetURSStore')
        .withArgs(ursStoreContract.address);
    });
  });

  describe('setBaseURI', async () => {
    const newBaseURI = 'http://new.com/';

    it("fails for nonOwner's request", async () => {
      const nonOwner = account1;
      await expect(
        ursFactoryContract.connect(nonOwner).setBaseURI(newBaseURI)
      ).to.be.revertedWith('caller is not ther owner');
    });

    it('sets baseURI', async () => {
      let currentBaseURI = await ursFactoryContract.baseURI();
      expect(currentBaseURI).to.eq(configs.baseURI);

      await ursFactoryContract.connect(deployer).setBaseURI(newBaseURI);
      currentBaseURI = await ursFactoryContract.baseURI();
      expect(currentBaseURI).to.eq(newBaseURI);
    });

    it("emits 'SetBaseURI' event", async () => {
      await expect(ursFactoryContract.connect(deployer).setBaseURI(newBaseURI))
        .to.emit(ursFactoryContract, 'SetBaseURI')
        .withArgs(newBaseURI);
    });
  });

  describe('mint', async () => {
    it('fails if transaction sender is neither owner nor ursStore', async () => {
      let stranger = account1;

      expect(await ursFactoryContract.owner()).not.to.eq(stranger.address);
      expect(await ursFactoryContract.ursStore()).not.to.eq(stranger.address);

      await expect(
        ursFactoryContract.connect(stranger).mint(stranger.address)
      ).to.be.revertedWith('caller is neither ursStore nor owner');
    });

    it('successfully mint new token by owner', async () => {
      const owner = deployer;
      expect(await ursFactoryContract.owner()).to.eq(owner.address);

      const receiver = account1;

      const tokenId = await ursFactoryContract.totalSupply();
      await expect(ursFactoryContract.ownerOf(tokenId)).to.be.revertedWith(
        'ERC721: owner query for nonexistent token'
      );

      await ursFactoryContract.connect(owner).mint(receiver.address);

      const ownerOfToken = await ursFactoryContract.ownerOf(tokenId);
      expect(ownerOfToken).to.eq(receiver.address);

      const currentTotalSupply = await ursFactoryContract.totalSupply();
      expect(currentTotalSupply).to.eq(tokenId.toNumber() + 1);
    });

    it('successfully mint new token by ursStore', async () => {
      const ursStore = ursStoreContract;
      await ursFactoryContract.connect(deployer).setURSStore(ursStore.address);
      expect(await ursFactoryContract.ursStore()).to.eq(ursStore.address);

      const receiver = account1;

      const tokenId = await ursFactoryContract.totalSupply();
      await expect(ursFactoryContract.ownerOf(tokenId)).to.be.revertedWith(
        'ERC721: owner query for nonexistent token'
      );

      await ursStore.connect(receiver).mint(receiver.address);

      const ownerOfToken = await ursFactoryContract.ownerOf(tokenId);
      expect(ownerOfToken).to.eq(receiver.address);

      const currentTotalSupply = await ursFactoryContract.totalSupply();
      expect(currentTotalSupply).to.eq(tokenId.toNumber() + 1);
    });
  });

  describe('tokenURI', async () => {
    it('returns with custom baseURI', async () => {
      const tokenId = await ursFactoryContract.totalSupply();
      await ursFactoryContract.connect(deployer).mint(deployer.address);

      let currentTokenURI = await ursFactoryContract.tokenURI(tokenId);
      expect(currentTokenURI).to.eq(`${configs.baseURI}${tokenId}`);

      const newBaseURI = 'http://new.com/';
      await ursFactoryContract.connect(deployer).setBaseURI(newBaseURI);
      expect(await ursFactoryContract.baseURI()).to.eq(newBaseURI);

      currentTokenURI = await ursFactoryContract.tokenURI(tokenId);
      expect(currentTokenURI).to.eq(`${newBaseURI}${tokenId}`);
    });
  });
});
