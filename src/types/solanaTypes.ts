// src/types/solanaTypes.ts
export interface SplTokenAccount {
  mint: string;
  owner: string;
  tokenAmount: number;
}

export interface CreateUserAndStoreSolanaKeypairResult {
  firebaseUserId: string;
  solanaPublic: string;
}

export interface solanaKeypair {
  secretKey: string;
  publicKey: string;
}
