// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { IAggregatorV3 } from "../baskets/interfaces/IAggregatorV3.sol";

contract MockAggregator is IAggregatorV3 {
    // solhint-disable-next-line immutable-vars-naming
    uint8 private immutable _decimals;
    int256 private _answer;
    uint80 private _roundId;
    uint80 private _answeredInRound;
    uint256 private _startedAt;
    uint256 private _updatedAt;

    constructor(uint8 decimals_, int256 initialAnswer) {
        _decimals = decimals_;
        _setAnswer(initialAnswer, block.timestamp);
    }

    function decimals() external view override returns (uint8) {
        return _decimals;
    }

    function latestRoundData()
        external
        view
        override
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        return (_roundId, _answer, _startedAt, _updatedAt, _answeredInRound);
    }

    function setAnswer(int256 newAnswer) external {
        _setAnswer(newAnswer, block.timestamp);
    }

    function setAnswerWithTimestamp(int256 newAnswer, uint256 timestamp) external {
        _setAnswer(newAnswer, timestamp);
    }

    function _setAnswer(int256 newAnswer, uint256 timestamp) internal {
        _roundId += 1;
        _answer = newAnswer;
        _startedAt = timestamp;
        _updatedAt = timestamp;
        _answeredInRound = _roundId;
    }
}
