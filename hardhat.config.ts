import '@typechain/hardhat';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-waffle';
import { HardhatUserConfig } from 'hardhat/config';

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

const config: HardhatUserConfig = {
  solidity: '0.8.4',
  networks: {
    hardhat: {
      initialBaseFeePerGas: 0,
    },
  },
  typechain: {
    outDir: './types',
    target: 'ethers-v5',
  },
};

export default config;
