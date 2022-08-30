const { assert, expect } = require("chai");
const { ethers, network, deployments, getNamedAccounts } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle unit tests", function () {
      let Raffle, vrfcoordinatormock, raffleEntranceFee, deployer, interval;
      const chainId = network.config.chainId;

      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]);
        Raffle = await ethers.getContract("raffle", deployer);
        vrfcoordinatormock = await ethers.getContract(
          "VRFCoordinatorV2Mock",
          deployer
        );
        raffleEntranceFee = await Raffle.getEntranceFee();
        interval = await Raffle.getInterval();
      });

      describe("constructor", function () {
        it("starts raffle correctly", async function () {
          const rafflestate = await Raffle.getRaffleState();
          assert.equal(rafflestate.toString(), "0");
          assert.equal(interval.toString(), networkConfig[chainId]["interval"]);
        });
      });
      describe("enter raffle", function () {
        it("reverts if not enough ETH is sent", async function () {
          await expect(Raffle.enterRaffle()).to.be.revertedWith(
            "RAFFLE__MinimumETHnotEntered"
          );
        });
        it("returns players", async function () {
          await Raffle.enterRaffle({ value: raffleEntranceFee });
          const playerfromgame = await Raffle.getPlayer(0);
          assert.equal(playerfromgame, deployer);
        });
        it("emits the players address", async function () {
          await expect(
            Raffle.enterRaffle({ value: raffleEntranceFee })
          ).to.emit(Raffle, "RafflePlayers");
        });
        it("it doesn't allow people to enter in calculating state", async function () {
          await Raffle.enterRaffle({ value: raffleEntranceFee }); //To enter the rafflestate wth some entrance fee or else we cannot enter the raffle
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]); // To fast forward time to interval time +1, that is 30+1 = 31. Only if the interval is passed, the state will become calculating,  due to which the openstate will revert
          await network.provider.send("evm_mine", []); //time travel syntax and to mine a block  for the travel
          //We are the chainlink keeper nowwwww
          await Raffle.performUpkeep([]); // calling performupkeep which woorks only in calculating state
          await expect(
            Raffle.enterRaffle({ value: raffleEntranceFee })
          ).to.be.revertedWith("Raffle__NotOpen");
        }); // now it will revert since it is in calculating state
      });
      describe("checkUpkeep", function () {
        it("returns falls if suffiecient eth is not present", async function () {
          //we haven't called the entrancefee function so it will be surely false
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const { upkeepNeeded } = await Raffle.callStatic.checkUpkeep([]); //callstatic simulates the transaction, without callstatic a original transsaction will take place
          assert(!upkeepNeeded);
        });

        it("returns falls if the state isn't open", async function () {
          await Raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          await Raffle.performUpkeep([]);
          const rafflestate = await Raffle.getRaffleState();
          const { upkeepNeeded } = await Raffle.callStatic.checkUpkeep([]);
          assert.equal(rafflestate.toString() == "1", upkeepNeeded == false);
        }); //(We enter the raffle using entry fee, then time travel using hardhat syntax,
        //enable performUpkeep,change rafflestate to calculating and store to rafflestate, then we check upkeepneeded which surely returns false)

        it("returns false if enough time hasn't passed", async function () {
          await Raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() - 10,
          ]);
          await network.provider.send("evm_mine", []);
          const { upkeepNeeded } = await Raffle.checkUpkeep([]);
          assert(!upkeepNeeded);
        });

        it("returns true if all  the condition mentioned are true", async function () {
          await Raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const { upkeepNeeded } = await Raffle.checkUpkeep([]);
          assert(upkeepNeeded);
        });
      });
      describe("performUpkeep", function () {
        it("Works only when checkUpkeep returns true", async function () {
          await Raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const tx = await Raffle.performUpkeep([]);
          assert(tx);
        });
        it("reverts if checkupkeep is false", async function () {
          await expect(Raffle.performUpkeep([])).to.be.revertedWith(
            "Raffle__UpkeepNotNeeded"
          );
        });
        it("changes state,looks for vrfCoordinator and returns requestId", async function () {
          await Raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const txResponse = await Raffle.performUpkeep([]);
          const txReceipt = await txResponse.wait(1);
          const rafflestate = await Raffle.getRaffleState();
          const requestId = txReceipt.events[1].args.requestId;
          assert(requestId.toNumber() > 0);
          assert(rafflestate.toString(), "1");
        });
      });
      describe("fulfillRandomwords", function () {
        beforeEach(async function () {
          //before each- kind of constant steps repeating all defines, so writing those common lines in beforeEach
          await Raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
        });
        it("works only if  the performUpkeep is completed", async function () {
          await expect(
            vrfcoordinatormock.fulfillRandomWords(0, Raffle.address) //gets the fullfill function from the VRFcoordinatormock
            //contract and gets two parameters of requestid and address
          ).to.be.revertedWith("nonexistent request");
          await expect(
            vrfcoordinatormock.fulfillRandomWords(1, Raffle.address)
          ).to.be.revertedWith("nonexistent request");
        });
        it("picks a winner, sends money and resets the array", async function () {
          const accounts = await ethers.getSigners();
          const additionalEntrances = 4;
          const startingIndex = 1;
          for (
            let i = startingIndex;
            i < startingIndex + additionalEntrances;
            i++
          ) {
            const accountsinRaffle = Raffle.connect(accounts[i]);
            await accountsinRaffle.enterRaffle({ value: raffleEntranceFee });
          }
          const startingTimestamp = await Raffle.getLastTimeStamp();
          await new Promise(async (resolve, reject) => {
            Raffle.once("WinnerPicked", async () => {
              try {
                /*const recentWinner = await Raffle.getrecentWinner();
                console.log(recentWinner);
                console.log(accounts[0].address);
                console.log(accounts[1].address);
                console.log(accounts[2].address);
                console.log(accounts[3].address);
                */

                const rafflestate = await Raffle.getRaffleState();
                const timestamp = await Raffle.getLastTimeStamp();
                const numplayers = await Raffle.getNumberOfPlayers();
                const winnerEndingBalance = await accounts[1].getBalance();
                assert.equal(numplayers.toString(), "0");
                assert.equal(rafflestate.toString(), "0");
                assert(timestamp > startingTimestamp);
                assert.equal(
                  winnerEndingBalance.toString(),
                  startingBalance.add(
                    raffleEntranceFee
                      .mul(additionalEntrances)
                      .add(raffleEntranceFee)
                  )
                );
              } catch (e) {
                reject(e);
              }
              resolve();
            });
            const tx = await Raffle.performUpkeep([]);
            const txReceipt = await tx.wait(1);
            const startingBalance = await accounts[1].getBalance();
            await vrfcoordinatormock.fulfillRandomWords(
              txReceipt.events[1].args.requestId,
              Raffle.address
            );
          });
        });
      });
    });

/* From line 157,
    1.Creates two variables of additional accounts and index is made to be 1, sice 0 is deployer
    2. using for loop the random accounts are connected to the raffle contract and it sends entrance fees
    3.setting the time of startingtimestamp with the getlasttimestamp function of raffle.sol
    4. WE have to listen for the performcheckup to finish to continue fullfillrandomword function
    5. We have to listen to fullfillrandomWords too, as the function doesn't get deployed and get the emitted "winnerPicked" function
    6. line 195-200  is for firing the fullfillrandom event and getting back the winnerPicked emit
    7. Promise function listens to the emitting value
    8. Resolve looks to complete the function within a time period which is given in hardhat.config
    9. mocha timeout = 300000 = 300 seconds
    10. if the function doesn't complete within 300 seconds, then reject takes place
    11. they are carried out by try and catch method
    12.  In try,  the constants are derived and they are asserted with their values and checked whether they are equal
    13. Created two balance varibales for the recent winner and checked for their balance
    14. they are asserted using the math by equaling the total eth in the account to endingbalanceofWinner
    15. the winner address is got by console.log (the commented out part)*/
