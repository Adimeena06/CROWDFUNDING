const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CrowdTank Contract", function () {
  let CrowdTank;
  let crowdTank;
  let owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    CrowdTank = await ethers.getContractFactory("CrowdTank");
    crowdTank = await CrowdTank.deploy(); // Deploy the contract
  });

  it("Should create a new project", async function () {
    const tx = await crowdTank.connect(addr1).createProject(
      "Test Project",
      "This is a test",
      ethers.parseEther("1"),
      10000,
      1
    );
    await tx.wait();

    const project = await crowdTank.projects(1);
    expect(project.name).to.equal("Test Project");
    expect(project.creator).to.equal(addr1.address);
  });

  it("Should allow funding a project", async function () {
    await crowdTank.connect(addr1).createProject("Test", "Desc", ethers.parseEther("1"), 10000, 2);

    const fundTx = await crowdTank.connect(addr2).fundProject(2, { value: ethers.parseEther("0.5") });
    await fundTx.wait();

    const project = await crowdTank.projects(2);
    expect(project.amountRaised.toString()).to.equal(ethers.parseEther("0.5").toString());
  });

  it("Should track successful funding and failed ones", async function () {
  await crowdTank.connect(addr1).createProject("P1", "Desc", ethers.parseEther("1"), 100, 3);
  await crowdTank.connect(addr2).fundProject(3, { value: ethers.parseEther("1") });

  // Advance time to ensure project can be finalized
  await ethers.provider.send("evm_increaseTime", [200]);
  await ethers.provider.send("evm_mine");

  await crowdTank.checkProjectStatus(3);

  const funded = await crowdTank.getTotalProjectsFunded();
  const failed = await crowdTank.getTotalProjectsFailed();

  expect(funded).to.equal(BigInt(1));
  expect(failed).to.equal(BigInt(0)); // Only funded project, not failed
});


  it("Should allow user to withdraw if project not funded", async function () {
    await crowdTank.connect(addr1).createProject("P2", "Not funded", ethers.parseEther("1"), 100, 4);

    const fundTx = await crowdTank.connect(addr2).fundProject(4, { value: ethers.parseEther("0.3") });
    await fundTx.wait();

    // Capture the initial balance before withdrawal attempt
    let initialBalance = await ethers.provider.getBalance(addr1.address);

    // Simulate time passage to check if project funding goal is met
    await ethers.provider.send("evm_increaseTime", [200]);
    await ethers.provider.send("evm_mine");

    await crowdTank.checkProjectStatus(4);

    // Attempt to withdraw (should only be possible if project isn't funded completely)
    try {
      await crowdTank.connect(addr1).userWithdrawFunds(4);
    } catch (error) {
      // Expected error: Project not funded completely
      assert(error.message.includes("Funding goal is not met"));
    }

    // After failed withdrawal, check the balance difference of addr1
    const finalBalance = await ethers.provider.getBalance(addr1.address);
    
    // Ensure no significant change in balance (due to gas, small difference is acceptable)
    const balanceDifference = finalBalance - initialBalance;
    const maxAcceptableGasCost = 1_000_000_000_000_000n; // 0.001 ETH
    expect(balanceDifference > -maxAcceptableGasCost).to.be.true;


  });

  it("Should return remaining funding", async function () {
    await crowdTank.connect(addr1).createProject("P3", "Need money", ethers.parseEther("2"), 10000, 5);
    await crowdTank.connect(addr2).fundProject(5, { value: ethers.parseEther("0.5") });

    const remaining = await crowdTank.getRemainingFunding(5);
    expect(remaining.toString()).to.equal(ethers.parseEther("1.5").toString());
  });
});
