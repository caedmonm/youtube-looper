const { test } = require('node:test');
const assert = require('node:assert/strict');
const { list, url, isLoop } = require('../library');
const loop = (id, videoId, start) => ({ id, videoId, start, end: start + 1, name: 'Passage', title: 'Music' });
test('library filters corrupt entries and keeps every video and passage', () => {
  const data = { 'loop:old': { start: 1, end: 3 }, 'saved-loop:a': loop('a', 'video1', 20), 'saved-loop:b': loop('b', 'video1', 10), 'saved-loop:c': loop('c', 'video2', 0), 'saved-loop:bad': { ...loop('bad', 'video1', 10), end: 2 } };
  assert.deepEqual(list(data, 'video1').map(item => item.id), ['b', 'a']);
  assert.equal(list(data).length, 3);
  assert.equal(isLoop({ ...loop('a', 'video1', 10), videoId: 'bad&v=other' }), false);
});
test('library links include video, starting time and exact saved-loop identity', () => {
  const link = new URL(url(loop('uuid-123', 'video_1', 15.5)));
  assert.equal(link.origin, 'https://www.youtube.com');
  assert.equal(link.searchParams.get('v'), 'video_1');
  assert.equal(link.searchParams.get('t'), '15s');
  assert.equal(link.hash, '#practice-loop=uuid-123');
});
