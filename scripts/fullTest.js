const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const [owner] = await hre.ethers.getSigners();

  const tokenAddr = process.env.ASIAFLEX_TOKEN_ADDR;
  const reserveAddr = process.env.RESERVE_CONTRACT;

  console.log("🚀 Running full AsiaFlex test suite with:", owner.address);
  console.log("🔗 AsiaFlexToken address:", tokenAddr);
  console.log("🔗 ProofOfReserve address:", reserveAddr);

  // Collegati ai contratti
  const token = await hre.ethers.getContractAt("AsiaFlexToken", tokenAddr);
  const proof = await hre.ethers.getContractAt("ProofOfReserve", reserveAddr);

  // ✅ Verifica che il contratto token sia corretto
  try {
    const contractOwner = await token.owner();
    console.log("👑 Contract owner (AsiaFlexToken):", contractOwner);
  } catch (e) {
    console.error("❌ Errore: l'indirizzo", tokenAddr, "NON è un AsiaFlexToken valido!");
    return;
  }

  // ✅ Verifica che ProofOfReserve funzioni
  try {
    const reserves = await proof.getReserve();
    console.log("🏦 ProofOfReserve attuale:", hre.ethers.formatUnits(reserves, 18), "USD");
  } catch (e) {
    console.error("❌ Errore: l'indirizzo", reserveAddr, "NON è un ProofOfReserve valido!");
    return;
  }

  // 1. Set reserves
  const reserveAmount = hre.ethers.parseUnits("1000", 18);
  let tx = await token.connect(owner).setReserves(reserveAmount);
  await tx.wait();
  console.log("📦 Reserves impostate a:", hre.ethers.formatUnits(reserveAmount, 18));

  // 2. Mint
  const mintAmount = hre.ethers.parseUnits("100", 18);
  tx = await token.connect(owner).mint(owner.address, mintAmount);
  await tx.wait();
  console.log("🪙 Minted:", hre.ethers.formatUnits(mintAmount, 18), "AFX");

  // 3. Burn
  const burnAmount = hre.ethers.parseUnits("10", 18);
  tx = await token.connect(owner).burnFrom(owner.address, burnAmount);
  await tx.wait();
  console.log("🔥 Burned:", hre.ethers.formatUnits(burnAmount, 18), "AFX");

  // 4. Redeem flow
  const redeemAmount = hre.ethers.parseUnits("5", 18);
  tx = await token.connect(owner).redeemRequest(redeemAmount);
  await tx.wait();
  const currentBlock = await hre.ethers.provider.getBlockNumber();
  console.log("📤 Redeem request:", hre.ethers.formatUnits(redeemAmount, 18), "at block", currentBlock);

  tx = await token.connect(owner).processRedeem(owner.address, currentBlock);
  await tx.wait();
  console.log("✅ Redeem processed at block", currentBlock);

  // 5. Set price
  const price = hre.ethers.parseUnits("85.48", 18);
  tx = await token.connect(owner).setPrice(price);
  await tx.wait();
  console.log("💲 Price impostato a:", hre.ethers.formatUnits(price, 18), "USD");

  // 6. Update Proof of Reserve
  const reserveUSD = hre.ethers.parseUnits("1000000", 18);
  tx = await proof.connect(owner).setReserve(reserveUSD);
  await tx.wait();
  console.log("🏦 ProofOfReserve aggiornato a:", hre.ethers.formatUnits(reserveUSD, 18), "USD");

  // 7. Transparency report
  const supply = await token.totalSupply();
  const reservesFinal = await proof.getReserve();
  console.log("\n📊 Transparency Report");
  console.log("Total Supply (AFX):", hre.ethers.formatUnits(supply, 18));
  console.log("Proof of Reserves (USD):", hre.ethers.formatUnits(reservesFinal, 18));
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exitCode = 1;
});

