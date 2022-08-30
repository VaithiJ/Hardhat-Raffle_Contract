//real testlink, not on hardhat(localhost) - staging test

const { assert, expect } = require("chai");
const { ethers, network, deployments, getNamedAccounts } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../../helper-hardhat-config");

developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle unit tests", function () {
      let Raffle, raffleEntranceFee, deployer;
      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        Raffle = await ethers.getContract("raffle", deployer);
        raffleEntranceFee = await Raffle.getEntranceFee();
      });
    });
describe("fullfillRandomWords", function () {
  it("This works with live chainlink keeepers and Vrf and not on localhost", async function () {
    const startingTimestamp = await Raffle.getLastTimeStamp();
    const accounts = await ethers.getSigners();

    await new Promise(async (reject, resolve) => {
      Raffle.once("WinnerPicked", async () => {
        console.log("WInnerPicked is fired");
        try {
          const rafflestate = await Raffle.getRaffleState();
          const winnerEndingBalance = await accounts[0].getBalance();
          const endingTimeStamp = await Raffle.getLastTimeStamp();
          await expect(Raffle.getPlayer(0)).to.be.reverted;
          assert.equal(recentWinner.toString(), accounts[0].address);
          assert.equal(rafflestate, 0);
          assert.equal(
            winnerEndingBalance.toString(),
            winnerStartingBalance.add(raffleEntranceFee).toString()
          );
          assert(endingTimeStamp > startingTimestamp);
          resolve();
        } catch (error) {
          console.log(error);
          reject(e);
        }
        await Raffle.enterRaffle({ value: raffleEntranceFee });
        const winnerStartingBalance = await accounts[0].getBalance();
      });
    });
  });
});
