//@flow
import streamToBuffer from 'stream-to-buffer';
import test from 'ava';
import MockFileMedia from '../../parsing/__mocks__/mock-file-media';
import FileChunk from '../file-chunk'

function streamToBufferPromise(stream) {
  return new Promise((resolve) => {
      streamToBuffer(stream, (err, buffer) => {
        resolve(buffer);
      });
    })
}


test('FileChunk#getStream should return a stream from its FileMedia', t => {
  t.plan(1);
  const bufferString ='123456789A';
  const fileMedia = new MockFileMedia(bufferString);
  const fileChunk = new FileChunk(fileMedia, 0, 5);
  return fileChunk.getStream()
                  .then(streamToBufferPromise)
                  .then((buffer) => {
                    t.deepEqual(new Buffer(bufferString, 'hex'), buffer);
                  });
});

test('FileChunk#getStream should return a stream with a subset stream of FileMedia', t => {
  t.plan(1);
  const bufferString ='123456789A';
  const fileMedia = new MockFileMedia(bufferString);
  const fileChunk = new FileChunk(fileMedia, 2, 5);
  return fileChunk.getStream()
                  .then(streamToBufferPromise)
                  .then((buffer) => {
                    t.deepEqual(new Buffer('56789A', 'hex'), buffer);
                  });
});
