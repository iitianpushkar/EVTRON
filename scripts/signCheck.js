require("dotenv").config();
const { ethers } = require("ethers");

const privateKey = process.env.PRIVATE_KEY;
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(privateKey, provider);

const contractAddress = "0x3Ee3BCB0d5b10176f470DdAa426dE682BC9928c0";
const chainId = 11155111; // Sepolia or your configured testnet

const abi = [
  "function createOrder((uint256 salt,address maker,address receiver,address makerAsset,address takerAsset,uint256 makingAmount,uint256 takingAmount), bytes extradata, bytes signature) external returns (bytes32)",
  "function hashOrder((uint256 salt,address maker,address receiver,address makerAsset,address takerAsset,uint256 makingAmount,uint256 takingAmount)) external view returns (bytes32)"
];

// === Setup domain and types for EIP-712 ===
const domain = {
  name: "1inch Limit Order Protocol",
  version: "4",
  chainId,
  verifyingContract: contractAddress
};

const types = {
  Order: [
    { name: "salt", type: "uint256" },
    { name: "maker", type: "address" },
    { name: "receiver", type: "address" },
    { name: "makerAsset", type: "address" },
    { name: "takerAsset", type: "address" },
    { name: "makingAmount", type: "uint256" },
    { name: "takingAmount", type: "uint256" }
  ]
};

async function main() {
  const contract = new ethers.Contract(contractAddress, abi, wallet);

  // Construct the order
  const order = {
    salt: 1,
    maker: wallet.address,
    receiver: wallet.address,
    makerAsset: "0x0000000000000000000000000000000000000000", // replace with token
    takerAsset: "0x0000000000000000000000000000000000000000", // replace with token
    makingAmount: ethers.parseUnits("1.0", 18),
    takingAmount: ethers.parseUnits("1.0", 18),
  };

  // Sign the EIP-712 order
  const signature = await wallet.signTypedData(domain, types, order);
  console.log("Signature:", signature);

  // Call createOrder
  const extradata = "0x"; // Optional calldata

  const tx = await contract.createOrder(order, extradata, signature);
  const receipt = await tx.wait();

  console.log("Order created successfully.");
  console.log("Transaction Hash:", receipt.hash);
}

main().catch((err) => {
  console.error("Error:", err);
});
