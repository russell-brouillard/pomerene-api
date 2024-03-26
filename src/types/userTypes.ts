export interface Metadata {
    updateAuthority: string;
    mint: string;
    name: string;
    symbol: string;
    uri: string;
    additionalMetadata: [string, string][];
}

export interface TokenObject {
    mint: string;
    owner: string;
    tokenAccount: string;
    tokenAmount: number;
    metadata: Metadata;
}