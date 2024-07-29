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

    const tokenContract = await hre.ethers.getContractFactory("MyToken");
    const token = await tokenContract.deploy("Test", "TST", 4);

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
      expect(pendingReward).to.equal(200);

      const userBalanceBeforeUnstake = await token.balanceOf(owner.address);
      await dsContract.unstake(0);
      const userBalanceAfterUnstake = await token.balanceOf(owner.address);

      expect(userBalanceAfterUnstake.sub(userBalanceBeforeUnstake)).to.equal(300);

    });

    it("Should check APY numbers for max stake period with smaller bonus", async function () {
      const {
        token,
        dsContract,
      } = await loadFixture(deploy);
      const [owner, otherAccount] = await ethers.getSigners();
      expect(await dsContract.calculateBonus(1000)).to.equal(1_100_000);
      await token.approve(dsContract.address, 10000);
      await dsContract.stake(1000, 365);
      await token.transfer(dsContract.address, 10000);
      const userInfo = await dsContract.userStakes(owner.address, 0);
      expect(userInfo.amount).to.equal(1000);
      await time.increase(60 * 60 * 24 *365);

      const pendingReward = await dsContract.calculatePendingRewards(0);
      expect(pendingReward).to.equal(2200);

      const userBalanceBeforeUnstake = await token.balanceOf(owner.address);
      await dsContract.unstake(0);
      const userBalanceAfterUnstake = await token.balanceOf(owner.address);

      expect(userBalanceAfterUnstake.sub(userBalanceBeforeUnstake)).to.equal(3200);

    });


    it("Should check APY numbers for max stake period with larger bonus", async function () {
      const {
        token,
        dsContract,
      } = await loadFixture(deploy);
      const [owner, otherAccount] = await ethers.getSigners();
      expect(await dsContract.calculateBonus(5000)).to.equal(1_200_000);
      await token.approve(dsContract.address, 10000);
      await dsContract.stake(5000, 365);
      await token.transfer(dsContract.address, 100000);
      const userInfo = await dsContract.userStakes(owner.address, 0);
      expect(userInfo.amount).to.equal(5000);
      await time.increase(60 * 60 * 24 *365);

      const pendingReward = await dsContract.calculatePendingRewards(0);
      expect(pendingReward).to.equal(12000);

      const userBalanceBeforeUnstake = await token.balanceOf(owner.address);
      await dsContract.unstake(0);
      const userBalanceAfterUnstake = await token.balanceOf(owner.address);

      expect(userBalanceAfterUnstake.sub(userBalanceBeforeUnstake)).to.equal(17000);

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
      expect(pendingReward).to.equal(200);

      const userBalanceBeforeUnstake = await token.balanceOf(owner.address);
      await dsContract.claimRewards(0);
      const userBalanceAfterUnstake = await token.balanceOf(owner.address);

      expect(userBalanceAfterUnstake.sub(userBalanceBeforeUnstake)).to.equal(200);

      await time.increase(60 * 60 * 24 *365);
      const pendingReward1 = await dsContract.calculatePendingRewards(0);
      expect(pendingReward1).to.equal(200);


      const userBalanceBeforeUnstake1 = await token.balanceOf(owner.address);
      await dsContract.unstake(0);
      const userBalanceAfterUnstake1 = await token.balanceOf(owner.address);

      expect(userBalanceAfterUnstake1.sub(userBalanceBeforeUnstake1)).to.equal(300);

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
      expect(pendingReward1).to.equal(54);

      const userBalanceBeforeUnstake = await token.balanceOf(owner.address);
      await dsContract.unstake(0);
      await dsContract.unstake(1);
      const userBalanceAfterUnstake = await token.balanceOf(owner.address);

      expect(userBalanceAfterUnstake.sub(userBalanceBeforeUnstake)).to.equal(454);
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

      expect(userBalanceAfterUnstake.sub(userBalanceBeforeUnstake)).to.equal(70);
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
