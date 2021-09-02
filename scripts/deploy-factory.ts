import { ethers } from 'hardhat';
import deployData from '../data/deploy-data.json';

const main: () => Promise<void> = async () => {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying contracts with the account:', deployer.address);

  const Factory = await ethers.getContractFactory('URSFactory');
  const contract = await Factory.deploy(
    deployData.factoryContractConfigs.name,
    deployData.factoryContractConfigs.symbol,
    deployData.factoryContractConfigs.baseURI
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
