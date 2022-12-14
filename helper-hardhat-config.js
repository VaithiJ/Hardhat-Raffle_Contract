const { ethers } = require("ethers");

const networkConfig = {
  5: {
    name: "goerli",
    vrfCoordinatorV2: "0x6168499c0cFfCaCD319c818142124B7A15E857ab",
    entrancefee: ethers.utils.parseEther("0.01"),
    keyHash:
      "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
    subscriptionId: "21057",
    callbackGasLimit: "500000",
    interval: "20",
  },
  31337: {
    name: "hardhat",
    entrancefee: ethers.utils.parseEther("0.01"),
    keyHash:
      "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
    callbackGasLimit: "500000",
    interval: "20",
  },
};

const developmentChains = ["hardhat", "localhost"];

module.exports = { networkConfig, developmentChains };
