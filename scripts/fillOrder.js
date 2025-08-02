require("dotenv").config();
const { ethers } = require("ethers");

async function main() {
  // ─── Setup ────────────────────────────────────────────────────────────────
  const RPC_URL = process.env.RPC_URL;
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const LIMIT_ORDER_ADDRESS = process.env.LIMIT_ORDER_ADDRESS;     // OrderMixin
  const ESCROW_FACTORY_ADDRESS = process.env.ESCROW_FACTORY_ADDRESS; // _cross_chain_swap

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const orderMixin = new ethers.Contract(
    LIMIT_ORDER_ADDRESS,
    [
      "function fillOrder((uint256 salt,address maker,address receiver,address makerAsset,address takerAsset,uint256 makingAmount,uint256 takingAmount),bytes signature,bytes extradata) external returns (bytes32)"
    ],
    wallet
  );

  // ─── 1) Generate secret & hashlock ───────────────────────────────────────
  const secret = ethers.randomBytes(32);
  const hashlock = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(["bytes32"], [secret])
  );
  
  console.log("Secret:", ethers.hexlify(secret));
  console.log("Hashlock:", hashlock);

  // ─── 2) Build timelocks (4 stages: 1h, 2h, 3h, 4h for example) ───────────
  // We'll just set the 4 “Src” stages; you can extend for “Dst” ones as needed.
  const oneHour = 60;
  const offsets = [
    oneHour, 
    oneHour * 60, 
    oneHour * 60, 
    oneHour * 60
  ]
    .map((v, i) => BigInt(v) << BigInt(i * 32))   // pack each uint32 into bits [i*32 .. i*32+31]
    .reduce((a, b) => a | b, 0n);

  const deployedAt = BigInt(Math.floor(Date.now() / 1000)) << 224n;
  const packedTimelocks = offsets | deployedAt;
  console.log("Packed Timelocks:", "0x" + packedTimelocks.toString(16).padStart(64, "0"));

  // ─── 3) Build ExtraDataArgs and ABI-encode ───────────────────────────────
  // Solidity: ExtraDataArgs { bytes32 hashlockInfo; uint256 dstChainId; address dstToken; uint256 deposits; Timelocks timelocks; }
  const dstChainId = 84532;                    // e.g. baseSepolia
  const dstToken   = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";       // or your destination asset
  const deposits   = ethers.parseUnits("0.1", 18); // optional escrow deposit

  const extraData = ethers.AbiCoder.defaultAbiCoder().encode(
    ["tuple(bytes32,uint256,address,uint256,uint256)"],
    [[ hashlock, dstChainId, dstToken, deposits, packedTimelocks ]]
  );
  console.log("extraData:", extraData);

  // ─── 4) Construct & sign the Order ───────────────────────────────────────
  const chainId = (await provider.getNetwork()).chainId;
  const domain = {
    name: "1inch Limit Order Protocol",
    version: "4",
    chainId,
    verifyingContract: LIMIT_ORDER_ADDRESS
  };
  const types = {
    Order: [
      { name: "salt",          type: "uint256" },
      { name: "maker",         type: "address" },
      { name: "receiver",      type: "address" },
      { name: "makerAsset",    type: "address" },
      { name: "takerAsset",    type: "address" },
      { name: "makingAmount",  type: "uint256" },
      { name: "takingAmount",  type: "uint256" },
    ]
  };

  // Example values—replace with your actual addresses & amounts:
  const order = {
    salt:           BigInt(1),
    maker:          await wallet.getAddress(),
    receiver:       ethers.ZeroAddress,
    makerAsset:     "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9",    // e.g. WETH on Sepolia
    takerAsset:     "0x036CbD53842c5426634e7929541eC2318f3dCF7e",    // e.g. USDC on baseSepolia
    makingAmount:   ethers.parseUnits("0.01", 18),
    takingAmount:   ethers.parseUnits("100", 6),
  };

  const signature = await wallet.signTypedData(domain, types, order);
  console.log("Signature:", signature);

    // ─── 5) Approve EscrowFactory to spend makerAsset ────────────────────────────
    const token = new ethers.Contract(
      order.makerAsset,
      [
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function allowance(address owner, address spender) external view returns (uint256)"
      ],
      wallet
    );
  
    const allowance = await token.allowance(wallet.address, ESCROW_FACTORY_ADDRESS);
    if (allowance < order.makingAmount) {
      console.log(`Approving ${ESCROW_FACTORY_ADDRESS} to spend ${order.makingAmount} of ${order.makerAsset}`);
      const approveTx = await token.approve(ESCROW_FACTORY_ADDRESS, order.makingAmount);
      await approveTx.wait();
      console.log("✅ Approval successful");
    } else {
      console.log("✅ Sufficient allowance already exists");
    }
  

  // ─── 6) Call fillOrder and deploy src escrow ─────────────────────────────
  const tx = await orderMixin.fillOrder(
    order,
    signature,
    extraData,
    { gasLimit: 1_000_000 }
  );
  console.log("tx hash:", tx.hash);
  const receipt = await tx.wait();
  console.log("✅ fillOrder mined, logs:");
  for (const log of receipt.logs) {
    try {
      console.log("  ", orderMixin.interface.parseLog(log));
    } catch {}
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
