//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

error RAFFLE__MinimumETHnotEntered();
error Transaction___Failed();
error Raffle__NotOpen();
error Raffle__UpkeepNotNeeded(
    uint256 currentBalance,
    uint256 numPlayers,
    uint256 raffleState
);

contract raffle is VRFConsumerBaseV2, KeeperCompatibleInterface {
    enum RaffleState {
        Open,
        Calculating
    }

    //--------------------------------------------State Variables-------------------------------------------------------
    uint private minimumFee;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    address payable[] public players;
    bytes32 private immutable i_keyHash;
    uint64 private immutable i_subscriptionId;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private immutable i_callbackGasLimit;
    uint32 private constant NUM_WORDS = 1;
    RaffleState private s_RaffleState;
    //--------------------------------------------Lottery variables----------------------------------------------------
    address private s_recentWinner;
    uint private immutable i_interval;
    uint private s_lastBlockTimeStamp;

    //---------------------------------------------------Events-------------------------------------------------------------

    event RafflePlayers(address indexed player);
    event RequestforWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winner);

    constructor(
        address vrfCoordinatorV2,
        uint entrancefee,
        bytes32 keyHash,
        uint64 subscriptionId,
        uint32 callbackGasLimit,
        uint interval
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        minimumFee = entrancefee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_keyHash = keyHash;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        s_RaffleState = RaffleState.Open;
        i_interval = interval;
        s_lastBlockTimeStamp = block.timestamp;
    }

    //enterRaffle
    function enterRaffle() public payable {
        if (msg.value < minimumFee) {
            revert RAFFLE__MinimumETHnotEntered();
        }
        if (s_RaffleState != RaffleState.Open) {
            revert Raffle__NotOpen();
        }
        players.push(payable(msg.sender));
        emit RafflePlayers(msg.sender);
    }

    /* Requirements for Checkup......
    1. The state of lottery must be open
    2. The time interval should have passed
    3. There should atleast 1 contestant with some eth
    4. Our subscription should be funded*/
    function checkUpkeep(bytes memory)
        public
        view
        override
        returns (bool upkeepNeeded, bytes memory)
    {
        bool isOpen = (s_RaffleState == RaffleState.Open);
        bool timePassed = ((block.timestamp - s_lastBlockTimeStamp) >
            i_interval);
        bool hasPlayers = (players.length > 0);
        bool hasBalance = address(this).balance > 0;
        upkeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
    }

    function performUpkeep(bytes memory) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded) {
            revert Raffle__UpkeepNotNeeded(
                address(this).balance,
                players.length,
                uint256(s_RaffleState)
            );
        }
        s_RaffleState = RaffleState.Calculating;
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_keyHash,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        emit RequestforWinner(requestId);
    }

    //pickRandomWinner
    function fulfillRandomWords(uint256, uint256[] memory randomWords)
        internal
        override
    {
        uint256 indexOfWinner = randomWords[0] % players.length;
        address payable recentWinner = players[indexOfWinner];
        s_recentWinner = recentWinner;
        s_RaffleState = RaffleState.Open;
        players = new address payable[](0);
        s_lastBlockTimeStamp = block.timestamp;
        (bool success, ) = recentWinner.call{value: address(this).balance}("");
        if (!success) {
            revert Transaction___Failed();
        }
        emit WinnerPicked(recentWinner);
    }

    function getEntranceFee() public view returns (uint) {
        return minimumFee;
    }

    function getPlayers(uint index) public view returns (address) {
        return players[index];
    }

    function getrecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    function getRaffleState() public view returns (RaffleState) {
        return s_RaffleState;
    }

    function getnumwords() public pure returns (uint256) {
        return NUM_WORDS;
    }

    function getLastTimeStamp() public view returns (uint256) {
        return s_lastBlockTimeStamp;
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return players[index];
    }

    function getNumberOfPlayers() public view returns (uint256) {
        return players.length;
    }
}
