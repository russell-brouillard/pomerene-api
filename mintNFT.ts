import {
    Connection,
    PublicKey,
    clusterApiUrl,
    Keypair,
    LAMPORTS_PER_SOL,
    Transaction,
  } from '@solana/web3.js';
  import {
    createCreateMetadataAccountV2Instruction,
    DataV2,
  } from '@metaplex-foundation/mpl-token-metadata';
  import fs from 'fs';
  
  // Function to mint an NFT
  async function mintNFT() {
    // Connect to the Solana devnet
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  
    // Generate a new wallet keypair and airdrop some SOL for transaction fees
    const payer = Keypair.generate();
    const airdropSignature = await connection.requestAirdrop(
      payer.publicKey,
      LAMPORTS_PER_SOL, // Airdropping 1 SOL to the wallet
    );
  
    // Confirm the transaction
    await connection.confirmTransaction(airdropSignature);
  
    // Your NFT metadata
    const metadata: DataV2 = {
      name: "My Custom NFT",
      symbol: "",
      uri: "https://example.com/nft-metadata.json", // URL pointing to your NFT metadata JSON
      sellerFeeBasisPoints: 500, // Represents a 5.00% seller fee
      creators: null,
      collection: null,
      uses: null,
    };
  
    // Create the CreateMetadataAccount instruction
    const instruction = createCreateMetadataAccountV2Instruction(
      {
        metadata: /* Your metadata account PublicKey */,
        mint: /* Your mint account PublicKey */,
        mintAuthority: payer.publicKey,
        payer: payer.publicKey,
        updateAuthority: payer.publicKey,
      },
      {
        createMetadataAccountArgsV2: {
          data: metadata,
          isMutable: true,
        },
      }
    );
  
    // Create and send the transaction
    let transaction = new Transaction().add(instruction);
    let signers = [payer /*, other signers if necessary */];
  
    let txid = await connection.sendTransaction(transaction, signers, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });
  
    console.log(`Minted NFT: Transaction ID: ${txid}`);
  }
  
  // Run the mintNFT function
  mintNFT().catch(console.error);
  