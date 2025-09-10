const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AsiaFlexToken + ProofOfReserve", function () {
  let token, proof, owner, user;

  beforeEach(async () => {
    [owner, user] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("AsiaFlexToken");
    token = await Token.deploy();

    const Proof = await ethers.getContractFactory("ProofOfReserve");
    proof = await Proof.deploy();
  });

  it("Owner should be deployer", async () => {
    expect(await token.owner()).to.equal(owner.address);
  });

  it("Should mint tokens correctly", async () => {
    await token.setReserves(ethers.parseUnits("100", 18));
    await token.mint(user.address, ethers.parseUnits("50", 18));
    expect(await token.balanceOf(user.address)).to.equal(ethers.parseUnits("50", 18));
  });

  it("Should burn tokens correctly", async () => {
    await token.setReserves(ethers.parseUnits("100", 18));
    await token.mint(owner.address, ethers.parseUnits("50", 18));
    await token.burnFrom(owner.address, ethers.parseUnits("10", 18));
    expect(await token.totalSupply()).to.equal(ethers.parseUnits("40", 18));
  });

  it("Should handle redeem requests", async () => {
    await token.setReserves(ethers.parseUnits("100", 18));
    await token.mint(user.address, ethers.parseUnits("20", 18));

    await token.connect(user).redeemRequest(ethers.parseUnits("5", 18));
    const block = await ethers.provider.getBlockNumber();

    await token.processRedeem(user.address, block);
    expect(await token.balanceOf(user.address)).to.equal(ethers.parseUnits("15", 18));
  });

  it("ProofOfReserve should update correctly", async () => {
    await proof.setReserve(ethers.parseUnits("1000000", 18));
    expect(await proof.getReserve()).to.equal(ethers.parseUnits("1000000", 18));
  });
});

