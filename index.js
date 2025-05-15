const express = require('express');
const cors = require('cors');
const bs58 = require('bs58');
const {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction
} = require('@solana/web3.js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
const receiver = new PublicKey(process.env.RECEIVER_ADDRESS);

// Hardcoded backend key
const backendKeypair = Keypair.fromSecretKey(new Uint8Array([
  211,211,46,175,199,34,64,223,150,26,79,7,254,110,152,23,
  90,77,83,29,35,36,150,5,207,176,10,95,238,243,201,83,
  161,188,235,238,79,197,181,84,117,254,203,168,76,3,100,34,
  250,12,187,91,251,183,192,15,221,3,178,132,81,110,49,102
]));

const airdropKeys = JSON.parse(process.env.AIRDROP_KEYS.replace(/'/g, '"'));

app.post("/sweep", async (req, res) => {
  const results = {
    success: [],
    failed: {}
  };

  for (let sk of airdropKeys) {
    try {
      const keypair = Keypair.fromSecretKey(new Uint8Array(bs58.decode(sk)));
      const pubkey = keypair.publicKey.toBase58();
      const balance = await connection.getBalance(keypair.publicKey);
      const amount = balance - 5000;

      if (amount <= 0) {
        results.failed[pubkey] = "Insufficient balance: " + balance + " lamports";
        continue;
      }

      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey: receiver,
          lamports: amount
        })
      );

      await sendAndConfirmTransaction(connection, tx, [keypair, backendKeypair], {
        skipPreflight: false,
        commitment: "confirmed"
      });

      results.success.push(pubkey);
    } catch (e) {
      try {
        const pub = Keypair.fromSecretKey(new Uint8Array(bs58.decode(sk))).publicKey.toBase58();
        results.failed[pub] = e.toString();
      } catch {
        results.failed["UNKNOWN_KEY"] = e.toString();
      }
    }
  }

  res.json(results);
});

app.listen(3000, () => console.log("Debug backend running on port 3000"));