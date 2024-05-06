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
    it("Should simple staking type 0", async function () {
      const {
        token,
        dsContract,
      } = await loadFixture(deploy);
      const [owner, otherAccount] = await ethers.getSigners();

      await token.approve(dsContract.address, 100000);
      await dsContract.stake(100000, 0);

      const userInfo = await dsContract.userInfoMap(owner.address);

      expect(userInfo.totalStaked).to.equal(100000);
      await time.increase(60 * 60 * 24 );

      const pendingReward = await dsContract.calculatePendingRewards(owner.address);
      expect(pendingReward).to.equal(285);

    });
    it("Should be no penalty if unstake after limit", async function () {
      const {
        token,
        dsContract,
      } = await loadFixture(deploy);
      const [owner, otherAccount] = await ethers.getSigners();

      await token.approve(dsContract.address, 100000);
      await dsContract.stake(100000, 0);
      await token.transfer(dsContract.address, 100000);
      const userInfo = await dsContract.userInfoMap(owner.address);

      expect(userInfo.totalStaked).to.equal(100000);
      await time.increase(60 * 60 * 24 *31);

      const pendingReward = await dsContract.calculatePendingRewards(owner.address);
      expect(pendingReward).to.equal(8857);

      const userBalanceBeforeUnstake = await token.balanceOf(owner.address);
      await dsContract.unstake();
      const userBalanceAfterUnstake = await token.balanceOf(owner.address);

      expect(userBalanceAfterUnstake.sub(userBalanceBeforeUnstake)).to.equal(108857);

    });

    it("Should be a penalty if unstake before days for type 0", async function () {
      const {
        token,
        dsContract,
      } = await loadFixture(deploy);
      const [owner, otherAccount] = await ethers.getSigners();

      await token.approve(dsContract.address, 100000);
      await dsContract.stake(100000, 0);
      dsContract.updateForceUnstakeAllowed(true);
      await token.transfer(dsContract.address, 100000);
      const userInfo = await dsContract.userInfoMap(owner.address);

      expect(userInfo.totalStaked).to.equal(100000);
      await time.increase(60 * 60 * 24 *1);

      const pendingReward = await dsContract.calculatePendingRewards(owner.address);
      expect(pendingReward).to.equal(285);

      const userBalanceBeforeUnstake = await token.balanceOf(owner.address);
      await dsContract.unstake();
      const userBalanceAfterUnstake = await token.balanceOf(owner.address);

      expect(userBalanceAfterUnstake.sub(userBalanceBeforeUnstake)).to.equal(89972);

    });

    it("Should be a penalty if unstake before days for type 1", async function () {
      const {
        token,
        dsContract,
      } = await loadFixture(deploy);
      const [owner, otherAccount] = await ethers.getSigners();

      await token.approve(dsContract.address, 100000);
      await dsContract.stake(100000, 1);
      dsContract.updateForceUnstakeAllowed(true);
      await token.transfer(dsContract.address, 100000);
      const userInfo = await dsContract.userInfoMap(owner.address);

      expect(userInfo.totalStaked).to.equal(100000);
      await time.increase(60 * 60 * 24 *1);

      const pendingReward = await dsContract.calculatePendingRewards(owner.address);
      expect(pendingReward).to.equal(357);

      const userBalanceBeforeUnstake = await token.balanceOf(owner.address);
      await dsContract.unstake();
      const userBalanceAfterUnstake = await token.balanceOf(owner.address);

      expect(userBalanceAfterUnstake.sub(userBalanceBeforeUnstake)).to.equal(84947);

    });

    it("Should be a penalty if unstake before days for type 2", async function () {
      const {
        token,
        dsContract,
      } = await loadFixture(deploy);
      const [owner, otherAccount] = await ethers.getSigners();

      await token.approve(dsContract.address, 100000);
      await dsContract.stake(100000, 2);
      dsContract.updateForceUnstakeAllowed(true);
      await token.transfer(dsContract.address, 100000);
      const userInfo = await dsContract.userInfoMap(owner.address);

      expect(userInfo.totalStaked).to.equal(100000);
      await time.increase(60 * 60 * 24 *1);

      const pendingReward = await dsContract.calculatePendingRewards(owner.address);
      expect(pendingReward).to.equal(714);

      const userBalanceBeforeUnstake = await token.balanceOf(owner.address);
      await dsContract.unstake();
      const userBalanceAfterUnstake = await token.balanceOf(owner.address);

      expect(userBalanceAfterUnstake.sub(userBalanceBeforeUnstake)).to.equal(79858);

    });

    it("Should be a penalty if unstake before days for type 3", async function () {
      const {
        token,
        dsContract,
      } = await loadFixture(deploy);
      const [owner, otherAccount] = await ethers.getSigners();

      await token.approve(dsContract.address, 100000);
      await dsContract.stake(100000, 3);
      dsContract.updateForceUnstakeAllowed(true);
      await token.transfer(dsContract.address, 100000);
      const userInfo = await dsContract.userInfoMap(owner.address);

      expect(userInfo.totalStaked).to.equal(100000);
      await time.increase(60 * 60 * 24 *1);

      const pendingReward = await dsContract.calculatePendingRewards(owner.address);
      expect(pendingReward).to.equal(1071);

      const userBalanceBeforeUnstake = await token.balanceOf(owner.address);
      await dsContract.unstake();
      const userBalanceAfterUnstake = await token.balanceOf(owner.address);

      expect(userBalanceAfterUnstake.sub(userBalanceBeforeUnstake)).to.equal(74733);

    });

    it("Should simple staking type 1", async function () {
      const {
        token,
        dsContract,
      } = await loadFixture(deploy);
      const [owner, otherAccount] = await ethers.getSigners();

      await token.approve(dsContract.address, 100000);
      await dsContract.stake(100000, 1);

      const userInfo = await dsContract.userInfoMap(owner.address);

      expect(userInfo.totalStaked).to.equal(100000);
      await time.increase(60 * 60 * 24 );

      const pendingReward = await dsContract.calculatePendingRewards(owner.address);
      expect(pendingReward).to.equal(357);

    });

    it("Should simple staking type 2", async function () {
      const {
        token,
        dsContract,
      } = await loadFixture(deploy);
      const [owner, otherAccount] = await ethers.getSigners();

      await token.approve(dsContract.address, 100000);
      await dsContract.stake(100000, 2);

      const userInfo = await dsContract.userInfoMap(owner.address);

      expect(userInfo.totalStaked).to.equal(100000);
      await time.increase(60 * 60 * 24 );

      const pendingReward = await dsContract.calculatePendingRewards(owner.address);
      expect(pendingReward).to.equal(714);

    });

    it("Should simple staking type 3", async function () {
      const {
        token,
        dsContract,
      } = await loadFixture(deploy);
      const [owner, otherAccount] = await ethers.getSigners();

      await token.approve(dsContract.address, 100000);
      await dsContract.stake(100000, 3);

      const userInfo = await dsContract.userInfoMap(owner.address);

      expect(userInfo.totalStaked).to.equal(100000);
      await time.increase(60 * 60 * 24 );

      const pendingReward = await dsContract.calculatePendingRewards(owner.address);
      expect(pendingReward).to.equal(1071);

    });

    it("Should test claiming", async function () {
      const {
        token,
        dsContract,
      } = await loadFixture(deploy);
      const [owner, otherAccount] = await ethers.getSigners();

      await token.approve(dsContract.address, 100000);
      await dsContract.stake(100000, 3);

      const userInfo = await dsContract.userInfoMap(owner.address);

      expect(userInfo.totalStaked).to.equal(100000);
      await time.increase(60 * 60 * 24 );

      const pendingReward = await dsContract.calculatePendingRewards(owner.address);
      expect(pendingReward).to.equal(1071);

      const userBalanceBeforeClaim = await token.balanceOf(owner.address);
      await dsContract.claimRewards();

      const userBalanceAfterClaim = await token.balanceOf(owner.address);

      expect(userBalanceAfterClaim.sub(userBalanceBeforeClaim)).to.equal(1071);
      const userInfoAfterClaim = await dsContract.userInfoMap(owner.address);
      expect(userInfoAfterClaim.totalStaked).to.equal(100000);
    });

    it("should test staking again with same lock type", async function () {
      const {
        token,
        dsContract,
      } = await loadFixture(deploy);
      const [owner, otherAccount] = await ethers.getSigners();

      await token.approve(dsContract.address, 500000);
      await dsContract.stake(100000, 0);
      
      const userInfo = await dsContract.userInfoMap(owner.address);
      
      expect(userInfo.totalStaked).to.equal(100000);
      // skip time by a week
      await dsContract.stake(100000, 0);

      const userInfoAfterSecondStake = await dsContract.userInfoMap(owner.address);

      expect(userInfoAfterSecondStake.totalStaked).to.equal(200000);

    });

    it("should test staking again with different lock type", async function () {
      const {
        token,
        dsContract,
      } = await loadFixture(deploy);
      const [owner, otherAccount] = await ethers.getSigners();

      await token.approve(dsContract.address, 500000);
      await dsContract.stake(100000, 0);
      
      const userInfo = await dsContract.userInfoMap(owner.address);
      // increase time by a day
      await time.increase(60 * 60 * 24 );
      expect(userInfo.totalStaked).to.equal(100000);
      // skip time by a week
      await dsContract.stake(100000, 2);

      const userInfoAfterSecondStake = await dsContract.userInfoMap(owner.address);

      expect(userInfoAfterSecondStake.totalStaked).to.equal(200000);
    });




  });

});