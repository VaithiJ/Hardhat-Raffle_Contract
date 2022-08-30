const { ethers, network } = require("hardhat");
const { networks } = require("../hardhat.config");
const {
  developmentChains,
  networkConfig,
} = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");
const Vrf_Fund_Amount = ethers.utils.parseEther("2");

module.exports = async function ({ deployments, getNamedAccounts }) {
  const { deployer } = await getNamedAccounts();
  const { deploy, log } = deployments;
  const chainId = network.config.chainId;

  let vrfCoordinatorV2Address, subscriptionId;

  if (developmentChains.includes(network.name)) {
    const vrfcoordinatormock = await ethers.getContract("VRFCoordinatorV2Mock");
    vrfCoordinatorV2Address = vrfcoordinatormock.address;
    const transactionResponse = await vrfcoordinatormock.createSubscription();
    const transactionReceipt = await transactionResponse.wait(1);
    subscriptionId = transactionReceipt.events[0].args.subId;
    await vrfcoordinatormock.fundSubscription(subscriptionId, Vrf_Fund_Amount);
  } else {
    vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"];
    subscriptionId = networkConfig[chainId]["subscriptionId"];
  }

  const entrancefee = networkConfig[chainId]["entrancefee"];
  const keyHash = networkConfig[chainId]["keyHash"];
  const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"];
  const interval = networkConfig[chainId]["interval"];

  const args = [
    vrfCoordinatorV2Address,
    entrancefee,
    keyHash,
    subscriptionId,
    callbackGasLimit,
    interval,
  ];

  const Raffle = await deploy("raffle", {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });
  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    log("Verifiying............");
    await verify(Raffle.address, args);
  }
  log("------------------------------------------------------------------");
};

module.exports.tags = ["all", "raffle"];

/* Possible errors ={
  1. ethers.getContract is not a function === change const{ethers} = require("hardhat")    not ("ethers")
  2. Cannot read properties of undefined (reading 'length') ==== arguments of the overrides may not be correct
  (the arguments of the constructor)...possibly missed "await" keyword or wrongly arranged the arguments or not defining them as a constant
}  3. Check the total number of arguments entered in deploy.js with smart contract constructor number*/
