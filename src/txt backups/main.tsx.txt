// src/main.tsx
import { Buffer } from "buffer";

(window as any).Buffer = Buffer;

import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

import { AuthCoreContextProvider } from "@particle-network/authkit";

createRoot(document.getElementById("root")!).render(
  // REMOVED StrictMode — fixes double-render race
  <AuthCoreContextProvider
    options={{
      projectId: "2bfdded2-1492-492e-9d86-6708b49743b3",
      clientKey: "cNIdFlDU3ja2R5Ct2GPCZmX7nwDQtWzGzoklar8H",
      appId: "8c49924f-519b-4378-a28a-5bf857a73694",

      chains: [
        {
          id: 8453,
          name: "Base",
          rpcUrl: "https://mainnet.base.org",
          nativeCurrency: {
            name: "Ether",
            symbol: "ETH",
            decimals: 18,
          },
        },
      ],

      wallet: {
        visible: true,
        supportChains: [8453],
      },

      auth: {
        disableEmbedWallet: false,
        socialLoginPrompt: "consent",
      },

      securityAccount: { promptSettingWhenSign: 0 },
    }}
  >
    <App />
  </AuthCoreContextProvider>
);