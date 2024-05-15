// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CallOption {
    address public asset;
    address public creator;
    uint256 public premium;
    uint256 public strikePrice;
    uint256 public quantity;
    uint256 public expiration;
    address public buyer;
    bool public inited;
    bool public bought;
    bool public executed;
    IERC20 public premiumToken;

    constructor(
        address _asset,
        uint256 _premium,
        uint256 _strikePrice,
        uint256 _quantity,
        uint256 _expiration,
        address _premiumToken
    ) {
        asset = _asset;
        creator = msg.sender;
        premium = _premium;
        strikePrice = _strikePrice;
        quantity = _quantity;
        expiration = _expiration;
        buyer = address(0);
        bought = false;
        executed = false;
        inited = false;
        premiumToken = IERC20(_premiumToken);
    }

    modifier isInited() {
        require(inited, "Contract has not been inited by the creator!");
        _;
    }

    modifier notBought() {
        require(!bought, "Contract has been bought!");
        _;
    }

    modifier notExecuted() {
        require(!executed, "Contract has been executed!");
        _;
    }

    modifier onlyBuyer() {
        require(msg.sender == buyer, "Only the buyer can call this function!");
        _;
    }

    modifier onlyCreator() {
        require(msg.sender == creator, "Only the creator can call this function!");
        _;
    }

    function init() external onlyCreator {
        require(IERC20(asset).transferFrom(creator, address(this), quantity), "Transfer failed");
        inited = true;
    }

    function buy() external notBought isInited {
        require(msg.sender != creator, "Creator cannot buy their own option");
        require(premiumToken.transferFrom(msg.sender, creator, premium), "Premium transfer failed");
        buyer = msg.sender;
        bought = true;
    }

    function transfer(address newBuyer) external onlyBuyer isInited {
        buyer = newBuyer;
    }

    function execute() external onlyBuyer notExecuted isInited {
        require(block.timestamp <= expiration, "Option expired");
        require(_checkPosition(), "Option is out of the money");

        uint256 amountToPay = strikePrice * quantity;
        require(premiumToken.transferFrom(buyer, creator, amountToPay), "Payment failed");
        require(IERC20(asset).transfer(buyer, quantity), "Asset transfer failed");

        executed = true;
    }

    function _checkPosition() internal pure returns (bool) {
        // call the Chainlink price feed for the asset
        // return uint256(price) >= strikePrice;
        return false;
    }

    function cancel() external onlyCreator notBought isInited {
        require(IERC20(asset).transfer(creator, quantity), "Asset transfer failed");
        executed = true;
    }

    function withdraw() external onlyCreator isInited {
        require(block.timestamp > expiration, "Option not expired yet");
        require(!executed, "Option already executed");

        require(IERC20(asset).transfer(creator, quantity), "Asset transfer failed");
        executed = true;
    }

    function adjustPremium(uint256 newPremium) external onlyCreator notBought isInited {
        premium = newPremium;
    }
}