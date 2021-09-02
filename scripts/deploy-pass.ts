import { ethers } from 'hardhat';
import deployData from '../data/deploy-data.json';

const main: () => Promise<void> = async () => {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying contracts with the account:', deployer.address);

  const Pass = await ethers.getContractFactory('contracts/Pass.sol:Pass');
  const contract = await Pass.deploy(
    deployData.passContractConfigs.name,
    deployData.passContractConfigs.symbol,
    deployData.passContractConfigs.baseURI
  );

  await contract.deployed();
  console.log('Contract deployed at:', contract.address);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
