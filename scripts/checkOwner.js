const { ethers } = require("hardhat");
require("dotenv").config();

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const ABI = require("../artifacts/contracts/AsiaFlexToken.sol/AsiaFlexToken.json").abi;

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
  const owner = await contract.owner();
  console.log("👑 Owner del contratto:", owner);
}

main();
