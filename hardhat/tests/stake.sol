// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";


contract StakingContract is Ownable, ReentrancyGuard{
    using SafeMath for uint;
    using SafeMath for uint256;

    // 1 lockup types (1 -  one month, 2 - 3 months, 3 - 6 months, 4 -  1 year)
    // 1 month lockup - earn per week 2%
    // 3 month lockup - earn per week 2.5%
    // 6 month lockup - earn per week 5%
    // 1 year lockup - earn per week 7.5%

    enum LockupType {ONE_MONTH, THREE_MONTHS, SIX_MONTHS, ONE_YEAR}
    uint256[] public lockupDays = [30_000_000_000, 90_000_000_000, 180_000_000_000, 365_000_000_000];

    struct userInfo{
        uint256 totalStaked;
        uint256 lastRewardCalculated;
        uint256 lastStaked;
        uint256 pendingRewards;
        uint256 lastClaimed;
        uint256 totalClaimed;
        LockupType lockupType;
    }

    mapping(address => userInfo) public userInfoMap;

    // reward rates per day
    uint256[] public rewardRatesPerDay = [2857142857, 3571428571, 7142857143, 10714285714];
    uint256 rewardFactor = 1e12;

    bool public isForceUnstakeAllowed = false;


    // penalty
    // loose 10%, 15%, 20%, and 25% respectively
    uint256[] public penaltyRates = [100000000000, 150000000000, 200000000000, 250000000000];
    
    address public cosmicTokenAddress;
    constructor(address _cosmicTokenAddress) {
        cosmicTokenAddress = _cosmicTokenAddress;
    }
    
    receive() external payable {
  	}

    function updateRewardRatesPerDay(uint256[] memory _rewardRatesPerDay) public onlyOwner {
        rewardRatesPerDay = _rewardRatesPerDay;
    }

    function updatePenaltyRates(uint256[] memory _penaltyRates) public onlyOwner {
        penaltyRates = _penaltyRates;
    }

    function updateCosmicTokenAddress(address _CosmicAddress) public onlyOwner {
        cosmicTokenAddress = _CosmicAddress;
    }

    function updateForceUnstakeAllowed(bool _isForceUnstakeAllowed) public onlyOwner {
        isForceUnstakeAllowed = _isForceUnstakeAllowed;
    }

    function stake(uint256 _amount, uint256 _lockupType) public nonReentrant {
        require(_lockupType >= 0 && _lockupType <= 3, "Invalid lockup type");
        require(_amount > 0, "Invalid amount");
        IERC20(cosmicTokenAddress).transferFrom(msg.sender, address(this), _amount);
        if(userInfoMap[msg.sender].lastStaked != 0){
            // lockup type must be greater than or equal to previous lockup type
            require(_lockupType >= uint256(userInfoMap[msg.sender].lockupType), "Invalid lockup type");
            // calculate pending rewards and update userInfoMap
            uint256 _pendingRewards = calculatePendingRewards(msg.sender);
            userInfoMap[msg.sender].pendingRewards = _pendingRewards;
        }

        userInfoMap[msg.sender].lastRewardCalculated = block.timestamp;
        userInfoMap[msg.sender].lastStaked = block.timestamp;
        userInfoMap[msg.sender].totalStaked = userInfoMap[msg.sender].totalStaked.add(_amount);
        userInfoMap[msg.sender].lockupType = LockupType(_lockupType);

    }

    function calculatePendingRewards(address _account) public view returns(uint256){
        uint256 _lastRewardCalculated = userInfoMap[_account].lastRewardCalculated;
        uint256 _totalStaked = userInfoMap[_account].totalStaked;
        uint256 _lockupType = uint256(userInfoMap[_account].lockupType);
        uint256 _currentTime = block.timestamp;
        uint256 _daysSinceLastRewardCalculated = _currentTime.sub(_lastRewardCalculated).mul(1e9).div(86400);
        uint256 _rewardRate = rewardRatesPerDay[_lockupType];
        uint256 _pendingRewards = _totalStaked.mul(_daysSinceLastRewardCalculated).mul(_rewardRate).div(rewardFactor).div(1e9);
        
        return _pendingRewards.add(userInfoMap[_account].pendingRewards);
    }

    function unstake() public nonReentrant{
        // check if unstaking before lockup period
        uint256 _lastStaked = userInfoMap[msg.sender].lastStaked;
        uint256 _daysSinceLastStaked = block.timestamp.sub(_lastStaked).mul(1e9).div(86400);
        if (_daysSinceLastStaked < lockupDays[uint256(userInfoMap[msg.sender].lockupType)]){
            require(isForceUnstakeAllowed, "Unstake not allowed before lockup period");
            // calculate penalty
            uint256 _penaltyRate = penaltyRates[uint256(userInfoMap[msg.sender].lockupType)];
            uint256 _pendingRewards = calculatePendingRewards(msg.sender);
           
            uint256 _penalty = (userInfoMap[msg.sender].totalStaked.add(_pendingRewards)).mul(_penaltyRate).div(rewardFactor);
            IERC20(cosmicTokenAddress).transfer(msg.sender, userInfoMap[msg.sender].totalStaked.sub(_penalty));
        }
        else{
            // calculate pending rewards and transfer
            uint256 _pendingRewards = calculatePendingRewards(msg.sender);
            IERC20(cosmicTokenAddress).transfer(msg.sender, userInfoMap[msg.sender].totalStaked.add(_pendingRewards));
        }

    }


    function claimRewards() public nonReentrant{
        uint256 _pendingRewards = calculatePendingRewards(msg.sender);
        IERC20(cosmicTokenAddress).transfer(msg.sender, _pendingRewards);
        userInfoMap[msg.sender].totalClaimed = userInfoMap[msg.sender].totalClaimed.add(_pendingRewards);
        userInfoMap[msg.sender].pendingRewards = 0;
        userInfoMap[msg.sender].lastClaimed = block.timestamp;
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