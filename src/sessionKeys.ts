// src/sessionKeys.ts
import { ethers } from "ethers";

// This uses Particle's built-in session key support via custom RPC
export async function getSessionSigner(aaProvider: ethers.Provider, smartAccountAddress: string) {
  // Request session key creation (24-hour expiry, allow all calls to your contract)
  const sessionParams = {
    expiry: Math.floor(Date.now() / 1000) + 24 * 3600, // 24 hours
    permissions: [
      {
        target: "0x9d154415f03Ba5389d703d381F2D8A0ea57bb6B8", // your contract
        methods: ["*"], // allow all functions
      },
    ],
  };

  // Particle's custom RPC for session keys
  const sessionKey = await aaProvider.send("aa_createSession", [sessionParams]);

  // Create signer from session key
  const sessionSigner = new ethers.Wallet(sessionKey.privateKey);

  return sessionSigner;
}