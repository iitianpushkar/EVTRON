require("dotenv").config();
const fs = require("fs");
const { ethers } = require("ethers");

async function fillOrder() {
  const RPC_URL = process.env.RPC_URL;
  const PRIVATE_KEY = process.env.EVM_PRIVATE_KEY;
  const LIMIT_ORDER_ADDRESS = process.env.LIMIT_ORDER_ADDRESS;
  const ESCROW_FACTORY_ADDRESS = process.env.ESCROW_FACTORY_ADDRESS;

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  const orderMixin = new ethers.Contract(
    LIMIT_ORDER_ADDRESS,
    [
      "function fillOrder((uint256 salt,address maker,address receiver,address makerAsset,address takerAsset,uint256 makingAmount,uint256 takingAmount),bytes,bytes) external returns (bytes32)"
    ],
    wallet
  );

  const {
    order,
    signature,
    extraData
  } = JSON.parse(fs.readFileSync("orders/order.json", "utf-8"));

  console.log("order",order)
  console.log("signature",signature)
  console.log("extraData",extraData)


  const tx = await orderMixin.fillOrder(order, signature, extraData, {
    gasLimit: 1_000_000,
  });

  console.log("⛓️ tx hash:", tx.hash);
  const receipt = await tx.wait();
  console.log("✅ Transaction mined");
}

fillOrder().catch(console.error);
