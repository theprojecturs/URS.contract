import 'hardhat-gas-reporter';
import '@typechain/hardhat';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-waffle';
import 'hardhat-contract-sizer';
import 'hardhat-tracer';
import 'solidity-coverage';
import { HardhatUserConfig } from 'hardhat/config';

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

const onlyRunInFullTest = () => (process.env.FULL_TEST ? true : false);

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.4',
    settings: {
      optimizer: {
        enabled: true,
        runs: 10000,
      },
    },
  },
  networks: {
    hardhat: {
      initialBaseFeePerGas: 0,
      accounts: {
        accountsBalance: '100000000000000000000000', // 100,000eth
      },
    },
  },
  typechain: {
    outDir: './types',
    target: 'ethers-v5',
  },
  gasReporter: {
    enabled: onlyRunInFullTest(),
    gasPrice: 20,
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: onlyRunInFullTest(),
    disambiguatePaths: false,
  },
};

export default config;
