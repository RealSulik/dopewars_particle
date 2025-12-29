export function useParticleAuth() {
  async function getWalletAddress() {
    const addr = (window as any)?.particle?.ethereum?.selectedAddress;
    return addr ?? null;
  }

  return { getWalletAddress };
}
