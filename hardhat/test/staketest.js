const {
  loadFixture, time
} = require("@nomicfoundation/hardhat-network-helpers");
const {
  expect
} = require("chai");

describe("StakingContract", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deploy() {
    // Contracts are deployed using the first signer/account by default
    const [owner] = await ethers.getSigners();

    const tokenContract = await hre.ethers.getContractFactory("CosmicNetwork");
    const token = await tokenContract.deploy();

    const stakingContract = await hre.ethers.getContractFactory("StakingContract");
    const dsContract = await stakingContract.deploy(token.address);
    return {
      token,
      dsContract,
      owner
    };
  }


  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const {
        token,
        dsContract,
      } = await loadFixture(deploy);
      const [owner, otherAccount] = await ethers.getSigners();

      expect(await dsContract.owner()).to.equal(owner.address);
    });
  });

  describe("Staking", function () {

    it("Should check APY numbers for max stake period", async function () {
      const {
        token,
        dsContract,
      } = await loadFixture(deploy);
      const [owner, otherAccount] = await ethers.getSigners();

      await token.approve(dsContract.address, 100);
      await dsContract.stake(100, 365);
      await token.transfer(dsContract.address, 100000);
      const userInfo = await dsContract.userStakes(owner.address, 0);
      expect(userInfo.amount).to.equal(100);
      await time.increase(60 * 60 * 24 *365);

      const pendingReward = await dsContract.calculatePendingRewards(0);
      expect(pendingReward).to.equal(120);

      const userBalanceBeforeUnstake = await token.balanceOf(owner.address);
      await dsContract.unstake(0);
      const userBalanceAfterUnstake = await token.balanceOf(owner.address);

      expect(userBalanceAfterUnstake.sub(userBalanceBeforeUnstake)).to.equal(220);

    });

    it("Should check APY numbers for max stake period with smaller bonus", async function () {
      const {
        token,
        dsContract,
      } = await loadFixture(deploy);
      const [owner, otherAccount] = await ethers.getSigners();
      const totalSupply = await token.totalSupply();
      console.log("ts", totalSupply);
      const amount = BigInt("100000000000000000000000");
      expect(await dsContract.calculateBonus(amount)).to.equal(1_100_000);
      await token.approve(dsContract.address, amount);
      await dsContract.stake(amount, 365);
      await token.transfer(dsContract.address, BigInt("1000000000000000000000000"));
      const userInfo = await dsContract.userStakes(owner.address, 0);
      expect(userInfo.amount).to.equal(amount);
      await time.increase(60 * 60 * 24 *365);

      const pendingReward = await dsContract.calculatePendingRewards(0);
      expect(pendingReward).to.equal(BigInt("132000004185665753424657"));

      const userBalanceBeforeUnstake = await token.balanceOf(owner.address);
      await dsContract.unstake(0);
      const userBalanceAfterUnstake = await token.balanceOf(owner.address);

      expect(userBalanceAfterUnstake.sub(userBalanceBeforeUnstake)).to.equal(BigInt("232000008371331506849315"));

    });


    it("Should check APY numbers for max stake period with larger bonus", async function () {
      const {
        token,
        dsContract,
      } = await loadFixture(deploy);
      const [owner, otherAccount] = await ethers.getSigners();
      const amount = BigInt("500000000000000000000000");
      expect(await dsContract.calculateBonus(amount)).to.equal(1_200_000);
      await token.approve(dsContract.address, amount);
      await dsContract.stake(amount, 365);
      await token.transfer(dsContract.address, BigInt("5000000000000000000000000"));
      const userInfo = await dsContract.userStakes(owner.address, 0);
      expect(userInfo.amount).to.equal(amount);
      await time.increase(60 * 60 * 24 *365);

      const pendingReward = await dsContract.calculatePendingRewards(0);
      expect(pendingReward).to.equal(BigInt("720000022830904109589041"));

      const userBalanceBeforeUnstake = await token.balanceOf(owner.address);
      await dsContract.unstake(0);
      const userBalanceAfterUnstake = await token.balanceOf(owner.address);

      expect(userBalanceAfterUnstake.sub(userBalanceBeforeUnstake)).to.equal(BigInt("1220000045661808219178082"));

    });

    it("Should check APY numbers for max stake period and test reward claims", async function () {
      const {
        token,
        dsContract,
      } = await loadFixture(deploy);
      const [owner, otherAccount] = await ethers.getSigners();

      await token.approve(dsContract.address, 100);
      await dsContract.stake(100, 365);
      await token.transfer(dsContract.address, 100000);
      const userInfo = await dsContract.userStakes(owner.address, 0);
      expect(userInfo.amount).to.equal(100);
      await time.increase(60 * 60 * 24 *365);

      const pendingReward = await dsContract.calculatePendingRewards(0);
      expect(pendingReward).to.equal(120);

      const userBalanceBeforeUnstake = await token.balanceOf(owner.address);
      await dsContract.claimRewards(0);
      const userBalanceAfterUnstake = await token.balanceOf(owner.address);

      expect(userBalanceAfterUnstake.sub(userBalanceBeforeUnstake)).to.equal(120);

      await time.increase(60 * 60 * 24 *365);
      const pendingReward1 = await dsContract.calculatePendingRewards(0);
      expect(pendingReward1).to.equal(120);


      const userBalanceBeforeUnstake1 = await token.balanceOf(owner.address);
      await dsContract.unstake(0);
      const userBalanceAfterUnstake1 = await token.balanceOf(owner.address);

      expect(userBalanceAfterUnstake1.sub(userBalanceBeforeUnstake1)).to.equal(220);

    });


    it("Should allow multiple stake instances", async function () {
      const {
        token,
        dsContract,
      } = await loadFixture(deploy);
      const [owner, otherAccount] = await ethers.getSigners();

      await token.approve(dsContract.address, 10000);
      await dsContract.stake(100, 365);
      await token.transfer(dsContract.address, 100000);
      const userInfo = await dsContract.userStakes(owner.address, 0);
      expect(userInfo.amount).to.equal(100);

      await dsContract.stake(100, 100);
      const userInfo1 = await dsContract.userStakes(owner.address, 1);
      expect(userInfo1.amount).to.equal(100);
      console.log(userInfo1);
      await time.increase(60 * 60 * 24 *365);

      const pendingReward1 = await dsContract.calculatePendingRewards(1);
      expect(pendingReward1).to.equal(32);

      const userBalanceBeforeUnstake = await token.balanceOf(owner.address);
      await dsContract.unstake(0);
      await dsContract.unstake(1);
      const userBalanceAfterUnstake = await token.balanceOf(owner.address);

      expect(userBalanceAfterUnstake.sub(userBalanceBeforeUnstake)).to.equal(352);
      expect(await dsContract.userStakeCount(owner.address)).to.equal(2);
      expect(dsContract.unstake(0)).to.be.revertedWith("Already unstaked");

      await time.increase(60 * 60 * 24 *10000);
      const pendingRewards = await dsContract.calculatePendingRewards(1);
      expect(pendingRewards).to.equal(0);
    });



    it("Should penalize max if unstake on day 0", async function () {
      const {
        token,
        dsContract,
      } = await loadFixture(deploy);
      const [owner, otherAccount] = await ethers.getSigners();

      await token.approve(dsContract.address, 100);
      await dsContract.stake(100, 365);
      await token.transfer(dsContract.address, 100000);
      const userInfo = await dsContract.userStakes(owner.address, 0);
      expect(userInfo.amount).to.equal(100);

      const pendingReward = await dsContract.calculatePendingRewards(0);
      expect(pendingReward).to.equal(0);

      const userBalanceBeforeUnstake = await token.balanceOf(owner.address);
      await dsContract.unstake(0);
      const userBalanceAfterUnstake = await token.balanceOf(owner.address);

      expect(userBalanceAfterUnstake.sub(userBalanceBeforeUnstake)).to.equal(25);
      const userInfo1 = await dsContract.userStakes(owner.address, 0);
      console.log(userInfo1);

    });


    it("Should check APY numbers for min stake period", async function () {
      const {
        token,
        dsContract,
      } = await loadFixture(deploy);
      const [owner, otherAccount] = await ethers.getSigners();

      await token.approve(dsContract.address, 100);
      await dsContract.stake(100, 1);
      await token.transfer(dsContract.address, 100000);
      const userInfo = await dsContract.userStakes(owner.address, 0);
      expect(userInfo.amount).to.equal(100);
      await time.increase(60 * 60 * 24 *365);

      const pendingReward = await dsContract.calculatePendingRewards(0);
      expect(pendingReward).to.equal(0);

      const userBalanceBeforeUnstake = await token.balanceOf(owner.address);
      await dsContract.unstake(0);
      const userBalanceAfterUnstake = await token.balanceOf(owner.address);

      expect(userBalanceAfterUnstake.sub(userBalanceBeforeUnstake)).to.equal(100);

    });
  });

});
