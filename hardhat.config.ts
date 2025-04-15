import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-gas-reporter";
import dotenv from "dotenv";

dotenv.config();
const {
  WALLET_PRIVATE_KEY = "",
  ETHERSCAN_API_KEY = "",
  ARBITRUM_API_KEY = "",
  BNB_API_KEY = "",
  POLYGON_SCAN = "",
  COIN_MARKETCAP_API_KEY = "",
  INFURA_KEY = "",
  REPORT_GAS = true,
} = process.env;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        // runs: 1,
      },
    },
  },
  typechain: {
    outDir: "./typechain",
  },
  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${INFURA_KEY}`,
      chainId: 11155111,
      accounts: [`0x${WALLET_PRIVATE_KEY}`],
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${INFURA_KEY}`,
      chainId: 1,
      accounts: [`0x${WALLET_PRIVATE_KEY}`],
    },
    arbitrum: {
      url: `https://arbitrum-mainnet.infura.io/v3/${INFURA_KEY}`,
      chainId: 42161,
      accounts: [`0x${WALLET_PRIVATE_KEY}`],
    },
    arbitrum_sepolia: {
      url: `https://arbitrum-sepolia.infura.io/v3/${INFURA_KEY}`,
      chainId: 421614,
      accounts: [`0x${WALLET_PRIVATE_KEY}`],
    },
    bnb: {
      url: "https://bsc-dataseed1.binance.org/",
      chainId: 56,
      accounts: [`0x${WALLET_PRIVATE_KEY}`],
    },
    bnb_testnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      accounts: [`0x${WALLET_PRIVATE_KEY}`],
    },
    mumbai: {
      url: `https://polygon-mumbai.infura.io/v3/${INFURA_KEY}`,
      chainId: 80001,
      accounts: [`0x${WALLET_PRIVATE_KEY}`],
    },
    onyx: {
      url: `https://rpc.onyx.org`,
      chainId: 80888,
      accounts: [`0x${WALLET_PRIVATE_KEY}`],
    },
  },
  etherscan: {
    apiKey: {
      mainnet: ETHERSCAN_API_KEY!,
      sepolia: ETHERSCAN_API_KEY!,
      polygonMumbai: POLYGON_SCAN!,
      bscTestnet: BNB_API_KEY!,
      arbitrum: ARBITRUM_API_KEY!,
      onyx: "",
    },
  },
  gasReporter: {
    enabled: Boolean(REPORT_GAS),
    outputFile: "gas-report.txt",
    noColors: true,
    coinmarketcap: COIN_MARKETCAP_API_KEY,
    currency: "USD",
    token: "ETH",
  },
};

export default config;
