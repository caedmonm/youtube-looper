const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseTime, formatTime, validRange, videoId } = require('../loop-core');
test('timestamps accept seconds, minutes, hours and milliseconds', () => {
  for (const [text, expected] of [['92.125', 92.125], ['1:32.125', 92.125], ['1:02:03.5', 3723.5], ['0', 0]]) assert.equal(parseTime(text), expected);
  for (const value of ['', '-1', '1:60', '1:2:60', 'abc', 'Infinity', '1.1234', '1:2:3:4']) assert.equal(parseTime(value), null);
});
test('format handles millisecond rollover and hours', () => {
  assert.equal(formatTime(59.9999), '1:00.000');
  assert.equal(formatTime(3723.125), '1:02:03.125');
  for (const time of [0, 0.2, 30.125, 3600, 86399.999]) assert.equal(parseTime(formatTime(time)), time);
});
test('loops must be ordered, bounded and at least 200ms', () => {
  assert.ok(validRange(10, 10.2, 100));
  assert.ok(validRange(0, 100, 100));
  for (const args of [[2, 1, 100], [1, 1.1, 100], [-1, 2, 100], [0, 101, 100], [0, null, 100], [0, 20, Infinity], [0, 20, NaN]]) assert.equal(validRange(...args), false);
});
test('only YouTube watch routes activate the player', () => {
  assert.equal(videoId('https://www.youtube.com/watch?v=abc&list=xyz'), 'abc');
  assert.equal(videoId('https://www.youtube.com/'), null);
  assert.equal(videoId('https://www.youtube.com/shorts/abc'), null);
});
