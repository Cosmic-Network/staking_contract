// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";


contract StakingContract is Ownable, ReentrancyGuard{
    using SafeMath for uint;
    using SafeMath for uint256;

    struct stakeInfo{
        uint256 amount;
        uint256 lockupDays;
        uint256 stakedOn;
        uint256 lastRewardCalculated;
        uint256 pendingRewards;
        uint256 lastClaimed;
        uint256 totalClaimed;
        uint256 apy;
        uint256 unstakedOn;
        uint256 penalty;

    }

    uint256 public constant MAX_APY = 2_000_000;
    uint256 public constant MAX_LOCKUP_DAYS = 365;
    uint256 public constant MAX_PENALTY = 300_000;
    uint256 public constant PRECISION = 1e6;

    uint256[2] public bonusTiers = [1_000, 5_000];
    uint256[2] public bonusBoosts = [1_100_000, 1_200_000];

    mapping(address => uint256) public userStakeCount;

    address public cosmicTokenAddress;
    mapping (address user => stakeInfo[]) public userStakes;

    constructor(address _cosmicTokenAddress) {
        cosmicTokenAddress = _cosmicTokenAddress;
    }
    
    receive() external payable {
  	}

    function calculateBonus(uint256 _amount) public view returns(uint256){
        uint256 supply_percentage = _amount.mul(PRECISION).div(IERC20(cosmicTokenAddress).totalSupply());
        if(supply_percentage >= bonusTiers[1]){
            return bonusBoosts[1];
        }
        if(supply_percentage >= bonusTiers[0]){
            return bonusBoosts[0];
        }
        return PRECISION;
    }

    function calculateAPY(uint256 _lockupDays) public pure returns(uint256){
        return _lockupDays.mul(MAX_APY).div(365);
    }

    function calculatePenalty(uint256 _lockupDays, uint256 _daysSinceLastStaked) public pure returns(uint256){
        if (_daysSinceLastStaked >= _lockupDays){
            return 0;
        }
        return MAX_PENALTY.sub(_daysSinceLastStaked.mul(MAX_PENALTY).div(_lockupDays));
    }
 
    function stake(uint256 _amount, uint256 _lockupDays) public nonReentrant {
        require(_lockupDays <= MAX_LOCKUP_DAYS, "Invalid lockup days");
        require(_lockupDays > 0, "Invalid lockup days");
        require(_lockupDays <= 365, "Invalid lockup days");
        require(_amount > 0, "Invalid amount");
        IERC20(cosmicTokenAddress).transferFrom(msg.sender, address(this), _amount);
        
        uint256 apy = calculateAPY(_lockupDays);

        stakeInfo memory newStake = stakeInfo({
            amount: _amount,
            lockupDays: _lockupDays,
            stakedOn: block.timestamp,
            lastRewardCalculated: block.timestamp,
            pendingRewards: 0,
            lastClaimed: block.timestamp,
            totalClaimed: 0,
            apy: apy,
            unstakedOn: 0,
            penalty: 0
        });
        userStakeCount[msg.sender] = userStakeCount[msg.sender].add(1);
        userStakes[msg.sender].push(newStake);
    }

    function calculatePendingRewards(uint256 _index) public view returns(uint256){
        address _account = msg.sender;
        uint256 _lastRewardCalculated = userStakes[_account][_index].lastRewardCalculated;
        uint256 _amount = userStakes[_account][_index].amount;
        uint256 _apy = userStakes[_account][_index].apy;
        uint256 _currentTime = block.timestamp;
        uint256 _daysSinceLastRewardCalculated = _currentTime.sub(_lastRewardCalculated).mul(1e9).div(86400);
        uint256 _amountAfterBonus = _amount.mul(calculateBonus(_amount)).div(PRECISION);
        uint256 _pendingRewards = _amountAfterBonus.mul(_daysSinceLastRewardCalculated).mul(_apy).div(365).div(1e9).div(PRECISION);
        
        return _pendingRewards.add(userStakes[_account][_index].pendingRewards);
    }

    function calculateUnstakePenalty(uint256 _index) public view returns(uint256){
        address _account = msg.sender;
        uint256 _lastStaked = userStakes[_account][_index].stakedOn;
        uint256 _lockupDays = userStakes[_account][_index].lockupDays;
        uint256 _daysSinceLastStaked = (block.timestamp.sub(_lastStaked)).div(86400);

        uint256 _penalty = calculatePenalty(_lockupDays, _daysSinceLastStaked);
        return _penalty;
    }

    function unstake(uint256 _index) public nonReentrant{
        address _account = msg.sender;
        require(_index < userStakes[_account].length, "Invalid index");
        require(userStakes[_account][_index].unstakedOn == 0, "Already unstaked");
        uint256 _penalty = calculateUnstakePenalty(_index);
        uint256 _penaltyAmount = userStakes[_account][_index].amount.mul(_penalty).div(PRECISION);
        uint256 _pendingRewards = calculatePendingRewards(_index);
        uint256 _amount = userStakes[_account][_index].amount;

        userStakes[_account][_index].pendingRewards = 0;
        userStakes[_account][_index].totalClaimed = userStakes[_account][_index].totalClaimed.add(_pendingRewards);
        userStakes[_account][_index].lastRewardCalculated = block.timestamp;
        userStakes[_account][_index].amount = 0;
        userStakes[_account][_index].unstakedOn = block.timestamp;
        userStakes[_account][_index].penalty = _penalty;

        IERC20(cosmicTokenAddress).transfer(_account, _amount.sub(_penaltyAmount).add(_pendingRewards));

    }

    function claimRewards(uint256 _index) public nonReentrant{
        address _account = msg.sender;
        require(_index < userStakes[_account].length, "Invalid index");
        uint256 _pendingRewards = calculatePendingRewards(_index);
        userStakes[_account][_index].lastRewardCalculated = block.timestamp;
        userStakes[_account][_index].pendingRewards = 0;
        userStakes[_account][_index].totalClaimed = userStakes[_account][_index].totalClaimed.add(_pendingRewards);
        userStakes[_account][_index].lastClaimed = block.timestamp;
        IERC20(cosmicTokenAddress).transfer(_account, _pendingRewards);
    }

    function emergenceyWithdrawTokens() public onlyOwner {
        IERC20(cosmicTokenAddress).transfer(owner(), IERC20(cosmicTokenAddress).balanceOf(address(this)));
    }

    function withdraw() public payable onlyOwner {
        (bool success, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        require(success);
    }

}
