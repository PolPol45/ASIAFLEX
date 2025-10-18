import "hardhat/register";
import hre from "hardhat";
import { loadAddresses, saveAddress } from "../helpers/addresses";

async function main() {
  const { ethers } = hre;
  const [admin] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkLabel = network.name || network.chainId.toString();

  const addressesOverride = process.env.BASKET_ADDRESSES_PATH;
  const { data: addresses } = loadAddresses(networkLabel, addressesOverride);

  const managerAddress = addresses.contracts?.BasketManager || addresses.BasketManager;
  if (!managerAddress) {
    throw new Error(`BasketManager address not found in deployments for ${networkLabel}.`);
  }

  const controllerFactory = await ethers.getContractFactory("BasketTreasuryController", admin);
  const controller = await controllerFactory.deploy(admin.address, managerAddress);
  await controller.waitForDeployment();

  const controllerAddress = await controller.getAddress();
  console.log(`✅ BasketTreasuryController deployed at: ${controllerAddress}`);

  saveAddress(networkLabel, "BasketTreasuryController", controllerAddress, addressesOverride);
  console.log("📝 Address registry updated.");

  const manager = await ethers.getContractAt("BasketManager", managerAddress, admin);
  const managerControllerRole = await manager.CONTROLLER_ROLE();
  if (!(await manager.hasRole(managerControllerRole, controllerAddress))) {
    const tx = await manager.grantRole(managerControllerRole, controllerAddress);
    await tx.wait();
    console.log(`🔐 Granted BasketManager CONTROLLER_ROLE to ${controllerAddress}`);
  } else {
    console.log("ℹ️ BasketManager already recognizes treasury as controller.");
  }

  const treasuryControllerRole = await controller.CONTROLLER_ROLE();
  if (!(await controller.hasRole(treasuryControllerRole, admin.address))) {
    const tx = await controller.grantRole(treasuryControllerRole, admin.address);
    await tx.wait();
    console.log(`🔐 Granted treasury CONTROLLER_ROLE to operator ${admin.address}`);
  }

  const treasurySignerRole = await controller.TREASURY_SIGNER_ROLE();
  if (!(await controller.hasRole(treasurySignerRole, admin.address))) {
    const tx = await controller.grantRole(treasurySignerRole, admin.address);
    await tx.wait();
    console.log(`🔐 Granted treasury signer role to ${admin.address}`);
  }

  console.log("✅ Basket treasury deployment complete.");
}

main().catch((error) => {
  console.error("❌ Basket treasury deployment failed:", error);
  process.exitCode = 1;
});
