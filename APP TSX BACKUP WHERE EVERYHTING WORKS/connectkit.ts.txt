// src/connectkit.ts

import { createConfig } from "@particle-network/connectkit";

export const config = createConfig({
  projectId: "2bfdded2-1492-492e-9d86-6708b49743b3",
  clientKey: "cNIdFlDU3ja2R5Ct2GPCZmX7nwDQtWzGzoklar8H",
  appId: "8c49924f-519b-4378-a28a-5bf857a73694",

  chains: [
    {
      id: 8453,
      name: "Base Mainnet",
      rpcUrl: "https://mainnet.base.org",
      nativeCurrency: {
        name: "Ether",
        symbol: "ETH",
        decimals: 18,
      },
    },
  ],

  // Let ConnectKit derive available wallets automatically
  walletConnectors: [],

  appearance: {
    theme: "dark",
    mode: "auto",
  },
});
