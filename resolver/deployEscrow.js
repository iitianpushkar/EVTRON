require("dotenv").config();
const {TronWeb} = require("tronweb");

const tronWeb = new TronWeb({
    fullHost: 'https://api.nileex.io', // here we use Nile test net
    privateKey:process.env.TRON_PRIVATE_KEY
  });

async function main() {


/*
  let abi = [
      {
        "inputs": [],
        "name": "counter",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "value",
            "type": "uint256"
          }
        ],
        "name": "initialize",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "withdraw",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "stateMutability": "payable",
        "type": "receive"
      }
  ];

const functionSelector = 'initialize(uint256)';
const parameter = [{type:'uint256',value:100}]
const tx = await tronWeb.transactionBuilder.triggerSmartContract('TAdp1wNzmSnZtVXijfB9bgqdsj3ykKqBbY', functionSelector, {callValue:1000000}, parameter);
const signedTx = await tronWeb.trx.sign(tx.transaction);
const result = await tronWeb.trx.sendRawTransaction(signedTx);

console.log("Transaction Result:", result);
  */

console.log("address",tronWeb.address.toHex("TU3sssqV5cXiih8HPnYpVR7J98V85rgMDh"));
}

main().catch(console.error);
