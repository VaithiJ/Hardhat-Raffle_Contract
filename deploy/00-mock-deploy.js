const { developmentChains } = require("../helper-hardhat-config");
const GAS_PRICE_LINK = 1e9;
const BASE_FEE = ethers.utils.parseEther("0.25");

module.exports = async function ({ deployments, getNamedAccounts }) {
  const { deployer } = await getNamedAccounts();
  const { deploy, log } = deployments;
  const chainId = network.config.chainId;

  if (developmentChains.includes(network.name)) {
    log("Local network detected......Deploying mocks..........");
    await deploy("VRFCoordinatorV2Mock", {
      from: deployer,
      log: true,
      args: [BASE_FEE, GAS_PRICE_LINK],
    });
  }
  log("Mocks deployed.................");
  log(
    "------------------------------------------------------------------------------------------"
  );
};

module.exports.tags = ["all", "mocks"];
