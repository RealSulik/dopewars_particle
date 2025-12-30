// src/sessionKeys.ts
import { ethers } from "ethers";

// Helper to build session permissions for your contract only
export function buildSessionPermissions() {
  return [
    {
      // Your DopeWars contract address
      target: "0x9d154415f03Ba5389d703d381F2D8A0ea57bb6B8",
      // Allow all functions on it
      methods: ["*"],
      // Optional: limit value per tx (e.g., prevent draining if key compromised)
      // valueLimit: ethers.parseEther("0.1"), // uncomment if you want
    },
  ];
}

// Expiry: 24 hours from now
export function getSessionExpiry() {
  return Math.floor(Date.now() / 1000) + 24 * 3600;
}