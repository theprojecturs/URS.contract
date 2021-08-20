import chai from 'chai';
import { ethers } from 'hardhat';
import { TestMintPass, TestMintPass__factory } from '../types';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { solidity } from 'ethereum-waffle';

chai.use(solidity);
const { expect } = chai;

const configs = {
  name: 'test',
  symbol: 'tst',
  baseURI: 'test.com',
};

describe('MintPass', function () {
  let [
    deployer,
    nonDeployer,
    tokenHolder,
    nonTokenHolder,
  ]: SignerWithAddress[] = [];
  let mintPassContract: TestMintPass;

  beforeEach(async () => {
    [deployer, nonDeployer, tokenHolder, nonTokenHolder] =
      await ethers.getSigners();
    const MintPassFactory = new TestMintPass__factory(deployer);
    mintPassContract = await MintPassFactory.deploy(
      configs.name,
      configs.symbol,
      configs.baseURI
    );
  });

  describe('constructor', async () => {
    it('Should be initialized successfully', async () => {
      expect(await mintPassContract.owner()).to.eq(deployer.address);
      expect(await mintPassContract.paused()).to.eq(true);
      expect(await mintPassContract.baseURI()).to.eq(configs.baseURI);
      expect(await mintPassContract.totalSupply()).to.eq(0);
      expect(await mintPassContract.MAX_SUPPLY()).to.eq(500);
      expect(await mintPassContract.name()).to.eq(configs.name);
      expect(await mintPassContract.symbol()).to.eq(configs.symbol);
    });
  });

  describe('pause', async () => {
    it('can be set by owner only', async () => {
      await expect(
        mintPassContract.connect(nonDeployer).pause()
      ).to.be.revertedWith('caller is not the owner');

      await expect(mintPassContract.connect(deployer).pause()).not.to.be
        .reverted;
    });

    it("emit 'Paused' event", async () => {
      await expect(mintPassContract.connect(deployer).pause()).to.emit(
        mintPassContract,
        'Paused'
      );
    });

    it('prevents token transfer', async () => {
      const tokenId = 10;
      await mintPassContract
        .connect(deployer)
        .mint(tokenHolder.address, tokenId);
      expect(await mintPassContract.ownerOf(tokenId)).to.eq(
        tokenHolder.address
      );

      expect(await mintPassContract.paused()).to.eq(true);

      await expect(
        mintPassContract
          .connect(tokenHolder)
          .transferFrom(tokenHolder.address, nonTokenHolder.address, tokenId)
      ).to.be.revertedWith('token transfer while paused');
    });
  });

  describe('unpause', async () => {
    it('can be set by owner only', async () => {
      await expect(
        mintPassContract.connect(nonDeployer).unpause()
      ).to.be.revertedWith('caller is not the owner');

      await expect(mintPassContract.connect(deployer).unpause()).not.to.be
        .reverted;
    });

    it("emit 'Unpaused' event", async () => {
      await expect(mintPassContract.connect(deployer).unpause()).to.emit(
        mintPassContract,
        'Unpaused'
      );
    });

    it('allow token transfer', async () => {
      const tokenId = 10;
      await mintPassContract
        .connect(deployer)
        .mint(tokenHolder.address, tokenId);
      expect(await mintPassContract.ownerOf(tokenId)).to.eq(
        tokenHolder.address
      );

      await mintPassContract.connect(deployer).unpause();
      expect(await mintPassContract.paused()).to.eq(false);

      await expect(
        mintPassContract
          .connect(tokenHolder)
          .transferFrom(tokenHolder.address, nonTokenHolder.address, tokenId)
      ).not.to.be.reverted;

      expect(await mintPassContract.ownerOf(tokenId)).to.eq(
        nonTokenHolder.address
      );
    });
  });

  describe('tokenURI', async () => {
    it('always return same endpoint', async () => {
      expect(await mintPassContract.tokenURI(0)).to.eq(configs.baseURI);
      expect(await mintPassContract.tokenURI(1)).to.eq(configs.baseURI);
    });
  });

  describe('claimPass', async () => {});
});
