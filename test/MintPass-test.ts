import chai from 'chai';
import { ethers } from 'hardhat';
import { TestMintPass, TestMintPass__factory } from '../types';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { solidity } from 'ethereum-waffle';
import { signTypedData, DomainType, splitSignature } from './utils/EIP712';

chai.use(solidity);
const { expect } = chai;

const MAX_SUPPLY = 500;
const configs = {
  name: 'test',
  symbol: 'tst',
  baseURI: 'test.com',
};

describe('MintPass', () => {
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

  describe('claimPass', async () => {
    const amount = 4;

    let contractOwner: SignerWithAddress = deployer;
    let receiver: SignerWithAddress = nonDeployer;
    let domain: DomainType;
    let types: any;
    let signature: string;

    // [v, r, s]
    let splitSig: [number, string, string];

    beforeEach(async () => {
      contractOwner = deployer;
      receiver = nonDeployer;
      domain = {
        name: configs.name,
        version: '1',
        chainId: 31337, // hardhat test chainId
        verifyingContract: mintPassContract.address,
      };
      types = {
        PassReq: [
          {
            name: 'receiver',
            type: 'address',
          },
          {
            name: 'amount',
            type: 'uint256',
          },
        ],
      };
      signature = await signTypedData({
        signer: contractOwner,
        domain,
        types,
        data: {
          receiver: receiver.address,
          amount,
        },
      });
      const { r, s, v } = splitSignature(signature);
      splitSig = [v, r, s];
    });

    it('successfully mints claimed amount pass', async () => {
      const currentPassBalance = await mintPassContract.balanceOf(
        receiver.address
      );

      await mintPassContract.connect(receiver).claimPass(amount, ...splitSig);

      const updatedPassBalance = await mintPassContract.balanceOf(
        receiver.address
      );
      expect(updatedPassBalance).to.eq(currentPassBalance.toNumber() + amount);
    });

    it('fails if user already holds pass', async () => {
      await mintPassContract.connect(receiver).claimPass(amount, ...splitSig);
      const passBalance = await mintPassContract.balanceOf(receiver.address);
      expect(passBalance).to.eq(amount).not.to.eq(0);

      await expect(
        mintPassContract.connect(receiver).claimPass(amount, ...splitSig)
      ).to.be.revertedWith('Already received pass');
    });

    it('fails if unmatched amount is sent', async () => {
      await expect(
        mintPassContract.connect(receiver).claimPass(amount + 1, ...splitSig)
      ).to.be.revertedWith('Signature is not from the owner');
    });

    it('fails if signer is not the contract owner', async () => {
      signature = await signTypedData({
        signer: receiver,
        domain,
        types,
        data: {
          receiver: receiver.address,
          amount,
        },
      });
      const { r, s, v } = splitSignature(signature);

      await expect(
        mintPassContract.connect(receiver).claimPass(amount + 1, v, r, s)
      ).to.be.revertedWith('Signature is not from the owner');
    });

    it('fails if receiver and transaction sender are different', async () => {
      await expect(
        mintPassContract.connect(deployer).claimPass(amount, ...splitSig)
      ).to.be.revertedWith('Signature is not from the owner');
    });

    it('fails if trying to mint more than MAX_SUPPLY', async () => {
      const attemptAmount = MAX_SUPPLY + 1;
      signature = await signTypedData({
        signer: contractOwner,
        domain,
        types,
        data: {
          receiver: receiver.address,
          amount: attemptAmount,
        },
      });
      const { r, s, v } = splitSignature(signature);

      await expect(
        mintPassContract.connect(receiver).claimPass(attemptAmount, v, r, s)
      ).to.be.revertedWith('Exceeds max supply');
    });

    it('emits ClaimPass event', async () => {
      await expect(
        mintPassContract.connect(receiver).claimPass(amount, ...splitSig)
      )
        .to.emit(mintPassContract, 'ClaimPass')
        .withArgs(receiver.address, amount);
    });
  });
});
