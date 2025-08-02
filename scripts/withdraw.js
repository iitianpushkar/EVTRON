require("dotenv").config();
const { ethers } = require("ethers");

async function main() {
  const RPC_URL = process.env.RPC_URL;
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const ESCROW_SRC_ADDRESS = "0x2517DDb765F4030cb67359f6BCB5210995D8Adda";

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  const escrowSrc = new ethers.Contract(
    ESCROW_SRC_ADDRESS,
    [
      "function withdraw(bytes32 secret, tuple(bytes32 orderHash, bytes32 hashlock, address maker, address taker, address token, uint256 amount, uint256 timelocks)) external"
    ],
    wallet
  );

  // ─── Provide the secret that matches the hashlock ──────────────────────────
  const secret = "0x5d9401f6f77ac30c00ab95f45ba81f47229a33a6aed427cbf00245c154cb684b"; // Example: 0xabc... (32-byte hex string)
  const expectedHashlock = "0xffb3ae2d57cf3aeb66c8a73864c65d45fdeb73c7c7a0f084ca9d6161a98a9941";

  const computedHashlock = ethers.keccak256(secret);
  if (computedHashlock !== expectedHashlock) {
    throw new Error(`Secret does not match expected hashlock. Got: ${computedHashlock}`);
  }

  // ─── Construct srcImmutables from your data ────────────────────────────────
  const srcImmutables = {
    orderHash: "0x526c5fca1c8ab094639725827d29784572fc01904e69647fd21d4726b85ccf08",
    hashlock: expectedHashlock,
    maker: "0x7C989DE93b2Dc4D853D878654C00Cb3E08B39C0B",
    taker: "0x7C989DE93b2Dc4D853D878654C00Cb3E08B39C0B",
    token: "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9",
    amount: ethers.parseUnits("0.01", 18), // 10000000000000000
    timelocks: BigInt("47291362861428153786668001096036205014818113288910388842008241632978183127100")
  };

  console.log("⏳ Sending withdraw tx...");
  const tx = await escrowSrc.withdraw(secret, srcImmutables, {
    gasLimit: 500_000
  });

  console.log("Tx hash:", tx.hash);
  const receipt = await tx.wait();
  console.log("✅ Withdraw completed");

  for (const log of receipt.logs) {
    try {
      const parsed = escrowSrc.interface.parseLog(log);
      console.log("  ", parsed.name, parsed.args);
    } catch {}
  }
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
