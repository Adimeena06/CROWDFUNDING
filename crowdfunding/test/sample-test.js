const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Greeter", function () {
  it("Should return the new greeting once it's changed", async function () {
    // Get the Greeter contract factory
    const Greeter = await ethers.getContractFactory("Greeter");
    
    // Deploy the Greeter contract with initial greeting
    const greeter = await Greeter.deploy("Hello, world!");

    // No need to call greeter.deployed() anymore, it's handled by the deploy method

    // Check the initial greeting
    expect(await greeter.greet()).to.equal("Hello, world!");

    // Set a new greeting
    const setGreetingTx = await greeter.setGreeting("Hola, mundo!");

    // Wait until the transaction is mined
    await setGreetingTx.wait();

    // Check the updated greeting
    expect(await greeter.greet()).to.equal("Hola, mundo!");
  });
});
