import { ethers } from 'hardhat';

const main: () => Promise<void> = async () => {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying contracts with the account:', deployer.address);

  const Store = await ethers.getContractFactory('URSStore');
  const contract = await Store.deploy();

  await contract.deployed();
  console.log('Contract deployed at:', contract.address);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
