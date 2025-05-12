// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CrowdTank {
    // struct to store project details
    struct Project {
        address creator;
        string name;
        string description;
        uint fundingGoal;
        uint deadline;
        uint amountRaised;
        bool funded;
    }
    // projectId => project details
    mapping(uint => Project) public projects;
    // projectId => user => contribution amount/funding amount 
    mapping(uint => mapping(address => uint)) public contributions;

    // projectId => whether the id is used or not
    mapping(uint => bool) public isIdUsed;

     // Tracks the number of successfully funded and failed projects
    uint public totalProjectsFunded;
    uint public totalProjectsFailed;

    // events
    event ProjectCreated(uint indexed projectId, address indexed creator, string name, string description, uint fundingGoal, uint deadline);
    event ProjectFunded(uint indexed projectId, address indexed contributor, uint amount);
    event FundsWithdrawn(uint indexed projectId, address indexed withdrawer, uint amount, string withdrawerType);
    // withdrawerType = "user" ,= "admin"

    // create project by a creator
    // external public internal private
    function createProject(string memory _name, string memory _description, uint _fundingGoal, uint _durationSeconds, uint _id) external {
        require(!isIdUsed[_id], "Project Id is already used");
        isIdUsed[_id] = true;
        projects[_id] = Project({
        creator : msg.sender,
        name : _name,
        description : _description,
        fundingGoal : _fundingGoal,
        deadline : block.timestamp + _durationSeconds,
        amountRaised : 0,
        funded : false
        });
        emit ProjectCreated(_id, msg.sender, _name, _description, _fundingGoal, block.timestamp + _durationSeconds);
    }

    function fundProject(uint _projectId) external payable {
        Project storage project = projects[_projectId];
        require(block.timestamp <= project.deadline, "Project deadline is already passed");
        require(!project.funded, "Project is already funded");
        require(msg.value > 0, "Must send some value of ether");

        //Function to check if the user is sending more than remaining funds,refund the excess amount if excess fund came 
        uint remainingFunds = project.fundingGoal - project.amountRaised;
        if (msg.value > remainingFunds){
            uint excessAmount = msg.value - remainingFunds;
            payable(msg.sender).transfer(excessAmount); //Refund the excess amount (if any)
            project.amountRaised = project.fundingGoal; // Raised amount cannot be more than funding goal amount
        } else {
            project.amountRaised += msg.value;
        }

        contributions[_projectId][msg.sender] = msg.value;
        emit ProjectFunded(_projectId, msg.sender, msg.value);
        if (project.amountRaised >= project.fundingGoal) {
            project.funded = true;
            totalProjectsFunded++;  // Increment the funded projects counter
        }
    }

    function userWithdrawFunds(uint _projectId) external payable {
        Project storage project = projects[_projectId];
        require(project.amountRaised < project.fundingGoal, "Funding goal is reached,user cant withdraw");
        uint fundContributed = contributions[_projectId][msg.sender];
        payable(msg.sender).transfer(fundContributed);
    }

    function adminWithdrawFunds(uint _projectId) external payable {
        Project storage project = projects[_projectId];
        uint totalFunding = project.amountRaised;
        require(project.funded, "Funding is not sufficient");
        require(project.creator == msg.sender, "Only project admin can withdraw");
        require(project.deadline <= block.timestamp, "Deadline for project is not reached");
        payable(msg.sender).transfer(totalFunding);
    }
    // Check if the project failed due to deadline or not being funded
    function checkProjectStatus(uint _projectId) external {
        Project storage project = projects[_projectId];
        if (block.timestamp > project.deadline && !project.funded) {
            totalProjectsFailed++;  // Increment failed projects if deadline passed and goal was not met
        }
    }

    // Getter functions to return the number of funded and failed projects
    function getTotalProjectsFunded() public view returns (uint) {
        return totalProjectsFunded;
    }

    function getTotalProjectsFailed() public view returns (uint) {
        return totalProjectsFailed;
    }

   // Read only function to return remaining funding of a project
   function getRemainingFunding(uint _projectId) public view returns (uint) {
    Project storage project = projects[_projectId];


    // Code for checking if the project is fully funded, return 0
    if(project.amountRaised >= project.fundingGoal){
        return 0;
    }

    // Return the remaning funding required for the project(if its not completed)
    return project.fundingGoal - project.amountRaised;
}
    // this is example of a read-only function
    function isIdUsedCall(uint _id)external view returns(bool){
        return isIdUsed[_id];
    }
}