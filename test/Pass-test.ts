import chai from 'chai';
import { ethers } from 'hardhat';
import { TestPass, TestPass__factory } from '../types';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { solidity } from 'ethereum-waffle';
import { signTypedData, DomainType, splitSignature } from './utils/EIP712';

chai.use(solidity);
const { expect } = chai;

const MAX_SUPPLY = 1000;
const configs = {
  name: 'test',
  symbol: 'tst',
  baseURI: 'test.com',
};

describe('Pass', () => {
  let [
    deployer,
    nonDeployer,
    tokenHolder,
    nonTokenHolder,
  ]: SignerWithAddress[] = [];
  let passContract: TestPass;

  beforeEach(async () => {
    [deployer, nonDeployer, tokenHolder, nonTokenHolder] =
      await ethers.getSigners();
    const PassFactory = new TestPass__factory(deployer);
    passContract = await PassFactory.deploy(
      configs.name,
      configs.symbol,
      configs.baseURI
    );
  });

  describe('constructor', async () => {
    it('Should be initialized successfully', async () => {
      expect(await passContract.owner()).to.eq(deployer.address);
      expect(await passContract.paused()).to.eq(true);
      expect(await passContract.baseURI()).to.eq(configs.baseURI);
      expect(await passContract.totalSupply()).to.eq(0);
      expect(await passContract.MAX_SUPPLY()).to.eq(MAX_SUPPLY);
      expect(await passContract.name()).to.eq(configs.name);
      expect(await passContract.symbol()).to.eq(configs.symbol);
      expect(await passContract.claimUntil()).to.eq(0);
    });
  });

  describe('pause', async () => {
    it('can be set by owner only', async () => {
      await expect(
        passContract.connect(nonDeployer).pause()
      ).to.be.revertedWith('caller is not the owner');

      await expect(passContract.connect(deployer).pause()).not.to.be.reverted;
    });

    it("emit 'Paused' event", async () => {
      await expect(passContract.connect(deployer).pause()).to.emit(
        passContract,
        'Paused'
      );
    });

    it('prevents token transfer', async () => {
      const tokenId = 10;
      await passContract.connect(deployer).mint(tokenHolder.address, tokenId);
      expect(await passContract.ownerOf(tokenId)).to.eq(tokenHolder.address);

      expect(await passContract.paused()).to.eq(true);

      await expect(
        passContract
          .connect(tokenHolder)
          .transferFrom(tokenHolder.address, nonTokenHolder.address, tokenId)
      ).to.be.revertedWith('token transfer while paused');
    });
  });

  describe('unpause', async () => {
    it('can be set by owner only', async () => {
      await expect(
        passContract.connect(nonDeployer).unpause()
      ).to.be.revertedWith('caller is not the owner');

      await expect(passContract.connect(deployer).unpause()).not.to.be.reverted;
    });

    it("emit 'Unpaused' event", async () => {
      await expect(passContract.connect(deployer).unpause()).to.emit(
        passContract,
        'Unpaused'
      );
    });

    it('allow token transfer', async () => {
      const tokenId = 10;
      await passContract.connect(deployer).mint(tokenHolder.address, tokenId);
      expect(await passContract.ownerOf(tokenId)).to.eq(tokenHolder.address);

      await passContract.connect(deployer).unpause();
      expect(await passContract.paused()).to.eq(false);

      await expect(
        passContract
          .connect(tokenHolder)
          .transferFrom(tokenHolder.address, nonTokenHolder.address, tokenId)
      ).not.to.be.reverted;

      expect(await passContract.ownerOf(tokenId)).to.eq(nonTokenHolder.address);
    });
  });

  describe('setClaimUntil', async () => {
    it("fails for non-owner's request", async () => {
      await expect(
        passContract.connect(nonDeployer).setClaimUntil(1)
      ).to.be.revertedWith('caller is not the owner');

      await expect(passContract.connect(deployer).setClaimUntil(1)).not.to.be
        .reverted;
    });

    it("sets 'claimUntil' timestamp", async () => {
      const targetTimestamp = 1000000;

      const currentTimestamp = await passContract.claimUntil();
      expect(currentTimestamp).to.eq(0).not.to.eq(targetTimestamp);

      await passContract.connect(deployer).setClaimUntil(targetTimestamp);

      const newTimestamp = await passContract.claimUntil();
      expect(newTimestamp).to.eq(targetTimestamp);
    });

    it("emits 'SetClaimUntil' event", async () => {
      const targetTimestamp = 1000000;

      await expect(
        passContract.connect(deployer).setClaimUntil(targetTimestamp)
      )
        .to.emit(passContract, 'SetClaimUntil')
        .withArgs(targetTimestamp);
    });
  });

  describe('tokenURI', async () => {
    it('always return same endpoint', async () => {
      expect(await passContract.tokenURI(0)).to.eq(configs.baseURI);
      expect(await passContract.tokenURI(1)).to.eq(configs.baseURI);
    });
  });

  describe('claimPass', async () => {
    let currentTimestamp: number;

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
        verifyingContract: passContract.address,
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

      const currentBlockNum = await ethers.provider.getBlockNumber();
      const currentBlock = await ethers.provider.getBlock(currentBlockNum);
      currentTimestamp = currentBlock.timestamp;

      await passContract.setClaimUntil(currentTimestamp + 3600);
    });

    it('successfully mints claimed amount pass', async () => {
      const currentPassBalance = await passContract.balanceOf(receiver.address);

      await passContract.connect(receiver).claimPass(amount, ...splitSig);

      const updatedPassBalance = await passContract.balanceOf(receiver.address);
      expect(updatedPassBalance).to.eq(currentPassBalance.toNumber() + amount);
    });

    it("fails if block.timestamp exceeds 'claimUntil' timestamp", async () => {
      await passContract.setClaimUntil(1);

      await expect(
        passContract.connect(receiver).claimPass(amount, ...splitSig)
      ).to.be.revertedWith('Claim period has been ended');

      await passContract.setClaimUntil(currentTimestamp + 3600);
      await expect(
        passContract.connect(receiver).claimPass(amount, ...splitSig)
      ).not.to.be.reverted;
    });

    it('fails if user already holds pass', async () => {
      await passContract.connect(receiver).claimPass(amount, ...splitSig);
      const passBalance = await passContract.balanceOf(receiver.address);
      expect(passBalance).to.eq(amount).not.to.eq(0);

      await expect(
        passContract.connect(receiver).claimPass(amount, ...splitSig)
      ).to.be.revertedWith('Already received pass');
    });

    it('fails if unmatched amount is sent', async () => {
      await expect(
        passContract.connect(receiver).claimPass(amount + 1, ...splitSig)
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
        passContract.connect(receiver).claimPass(amount + 1, v, r, s)
      ).to.be.revertedWith('Signature is not from the owner');
    });

    it('fails if receiver and transaction sender are different', async () => {
      await expect(
        passContract.connect(deployer).claimPass(amount, ...splitSig)
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
        passContract.connect(receiver).claimPass(attemptAmount, v, r, s)
      ).to.be.revertedWith('Exceeds max supply');
    });

    it('emits ClaimPass event', async () => {
      await expect(
        passContract.connect(receiver).claimPass(amount, ...splitSig)
      )
        .to.emit(passContract, 'ClaimPass')
        .withArgs(receiver.address, amount);
    });
  });

  describe('retrieveUnclaimedPass', async () => {
    it("fails for non-owner's request", async () => {
      await expect(
        passContract
          .connect(nonDeployer)
          .retrieveUnclaimedPass(nonDeployer.address, 1)
      ).to.be.revertedWith('caller is not the owner');

      await expect(
        passContract
          .connect(deployer)
          .retrieveUnclaimedPass(nonDeployer.address, 1)
      ).not.to.be.reverted;
    });

    it('fails if pass amount exceeds max supply', async () => {
      await expect(
        passContract
          .connect(deployer)
          .retrieveUnclaimedPass(nonDeployer.address, MAX_SUPPLY + 1)
      ).to.be.revertedWith('Exceeds max supply');
    });

    it('mints passes', async () => {
      const receiver = nonDeployer;
      const amount = 5;

      const balanceBefore = await passContract.balanceOf(receiver.address);
      const totalSupplyBefore = await passContract.totalSupply();

      await passContract
        .connect(deployer)
        .retrieveUnclaimedPass(receiver.address, 5);

      const balanceAfter = await passContract.balanceOf(receiver.address);
      expect(balanceAfter).to.equal(balanceBefore.add(amount));

      const totalSupplyAfter = await passContract.totalSupply();
      expect(totalSupplyAfter).to.equal(totalSupplyBefore.add(amount));
    });

    it("emits 'RetrieveUnclaimedPass' event", async () => {
      const receiver = nonDeployer;
      const amount = 5;

      await expect(
        passContract
          .connect(deployer)
          .retrieveUnclaimedPass(receiver.address, amount)
      )
        .to.emit(passContract, 'RetrieveUnclaimedPass')
        .withArgs(receiver.address, amount);
    });
  });
});
