require("dotenv").config();
const { ethers } = require("ethers");
const path = require("path");
const fs = require("fs");

async function createOrder() {
  // ─── Setup ────────────────────────────────────────────────────────────────
  const RPC_URL = process.env.RPC_URL;
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const LIMIT_ORDER_ADDRESS = process.env.LIMIT_ORDER_ADDRESS;     // OrderMixin
  const ESCROW_FACTORY_ADDRESS = process.env.ESCROW_FACTORY_ADDRESS; // _cross_chain_swap

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);


  const secret = ethers.randomBytes(32);
  const hashlock = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(["bytes32"], [secret])
  );
  
  console.log("Secret:", ethers.hexlify(secret));
  console.log("Hashlock:", hashlock);

  const oneHour = 60;
  const offsets = [
    oneHour, 
    oneHour * 60, 
    oneHour * 60, 
    oneHour * 60
  ]
    .map((v, i) => BigInt(v) << BigInt(i * 32))   
    .reduce((a, b) => a | b, 0n);

  const deployedAt = BigInt(Math.floor(Date.now() / 1000)) << 224n;
  const packedTimelocks = offsets | deployedAt;
  console.log("Packed Timelocks:", "0x" + packedTimelocks.toString(16).padStart(64, "0"));

  
  const dstChainId = 3448148188;            
  const dstToken   = ethers.ZeroAddress;
  const deposits   = ethers.parseUnits("0", 18);
 // const dstReceiver = "TJA1LC7eeZQhuQpADNxzGfuu4RSSiG68jv";

  const extraData = ethers.AbiCoder.defaultAbiCoder().encode(
    ["tuple(bytes32,uint256,address,uint256,uint256)"],
    [[ hashlock, dstChainId, dstToken, deposits, packedTimelocks ]]
  );
  console.log("extraData:", extraData);

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

  const order = {
    salt:           BigInt(Date.now()), 
    maker:          await wallet.getAddress(),
    receiver:       "0xc6546151c43038a40bbb922c1c8d8fd656da60fd",
    makerAsset:     "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9",    
    takerAsset:     ethers.ZeroAddress,   
    makingAmount:   ethers.parseUnits("0.01", 18),
    takingAmount:   ethers.parseUnits("100", 6),
  };

  const signature = await wallet.signTypedData(domain, types, order);
  console.log("Signature:", signature);


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

    const completeOrder = {
        order,
        signature,
        extraData,
      };

      const secrets = {
        secret: ethers.hexlify(secret),
        hashlock:hashlock
      };


      const outDir = path.resolve(__dirname, "./secrets");
      const outPath = path.join(outDir, "secret.json");
  
      if (!fs.existsSync(outDir)) {
          fs.mkdirSync(outDir, { recursive: true });
      }
  
      fs.writeFileSync(
          outPath,
          JSON.stringify(secrets, (key, value) =>
            typeof value === "bigint" ? value.toString() : value,
          2)
        );
    

    const outputDir = path.resolve(__dirname, "../resolver/orders");
    const outputPath = path.join(outputDir, "order.json");

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(
        outputPath,
        JSON.stringify(completeOrder, (key, value) =>
          typeof value === "bigint" ? value.toString() : value,
        2)
      );
      
    console.log("✅ Order data written to", outputPath);
  
}

createOrder().catch((err) => {
  console.error(err);
  process.exit(1);
});
