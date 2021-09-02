const { ethers } = require('hardhat');

const configs = {
  name: 'TEST PASS',
  symbol: 'PASS',
  baseURI: 'ipfs://QmQqzMTavQgT4f4T5v6PWBp7XNKtoPmC9jvn12WPT3gkSE',
};

const main = async () => {
  const [deployer] = await ethers.getSigners();

  console.log('Deploying contracts with the account:', deployer.address);

  const Pass = await ethers.getContractFactory('contracts/Pass.sol:Pass');
  const contract = await Pass.deploy(
    configs.name,
    configs.symbol,
    configs.baseURI
  );

  await contract.deployed();
  console.log('Contract deployed at:', contract.address);
};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
