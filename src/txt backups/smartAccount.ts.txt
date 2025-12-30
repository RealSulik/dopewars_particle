// src/smartAccount.ts
import { SmartAccount } from "@particle-network/aa";
import { Base } from "@particle-network/chains";

const config = {
  projectId: "2bfdded2-1492-492e-9d86-6708b49743b3",
  clientKey: "cNIdFlDU3ja2R5Ct2GPCZmX7nwDQtWzGzoklar8H",
  appId: "8c49924f-519b-4378-a28a-5bf857a73694",
};

export async function createSmartAccount(provider: any): Promise<SmartAccount> {
  const smartAccount = new SmartAccount(provider, {
    ...config,
    aaOptions: {
      accountContracts: {
        SIMPLE: [{ chainIds: [Base.id], version: "1.0.0" }],
      },
    },
  });

  return smartAccount;
}