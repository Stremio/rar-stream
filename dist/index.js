// src/rar-files-package.ts
import { EventEmitter } from "events";

// src/rar-file-bundle.ts
var RXX_EXTENSION = /\.R(\d\d?\d?\d?\d?\d?)$|\.RAR$/i;
var RAR_EXTENSION = /.RAR$/i;
var PARTXX_RAR_EXTENSION = /\.PART(\d\d?\d?\d?\d?)\.RAR$/i;
var isPartXXExtension = (fileMedias = []) => {
  let anyPartXXTypes = fileMedias.filter(
    (file) => file.name && file.name.match(PARTXX_RAR_EXTENSION)
  );
  if (anyPartXXTypes.length > 0) {
    return true;
  } else {
    return false;
  }
};
var NumericRarFileBundle = class {
  constructor(fileMedias = []) {
    this.fileMedias = fileMedias;
    if (this.fileMedias.length > 0) {
      this.filter();
      this.sort();
    }
  }
  filter() {
    this.fileMedias = this.fileMedias.filter(
      (file) => file.name && file.name.match(RXX_EXTENSION)
    );
  }
  sort() {
    this.fileMedias.sort((first, second) => {
      if (first.name.match(RAR_EXTENSION)) {
        return -1;
      } else if (second.name.match(RAR_EXTENSION)) {
        return 1;
      } else {
        const firstMatch = first.name.match(RXX_EXTENSION);
        const secondMatch = second.name.match(RXX_EXTENSION);
        const firstNumber = +(firstMatch && firstMatch[1] || 0);
        const secondNumber = +(secondMatch && secondMatch[1] || 0);
        return firstNumber - secondNumber;
      }
    });
  }
  get length() {
    return this.fileMedias.length;
  }
  get fileNames() {
    return this.fileMedias.map((file) => file.name);
  }
  get files() {
    return this.fileMedias;
  }
};
var PartXXRarBundle = class {
  constructor(fileMedias = []) {
    this.fileMedias = fileMedias;
    if (this.fileMedias.length > 0) {
      this.filter();
      this.sort();
    }
  }
  filter() {
    this.fileMedias = this.fileMedias.filter(
      (file) => file.name.match(PARTXX_RAR_EXTENSION)
    );
  }
  sort() {
    this.fileMedias.sort((first, second) => {
      const firstMatch = first.name.match(PARTXX_RAR_EXTENSION);
      const secondMatch = second.name.match(PARTXX_RAR_EXTENSION);
      const firstNumber = +(firstMatch && firstMatch[1] || 0);
      const secondNumber = +(secondMatch && secondMatch[1] || 0);
      return firstNumber - secondNumber;
    });
  }
  get length() {
    return this.fileMedias.length;
  }
  get fileNames() {
    return this.fileMedias.map((file) => file.name);
  }
  get files() {
    return this.fileMedias;
  }
};
var makeRarFileBundle = (fileMedias = []) => {
  return isPartXXExtension(fileMedias) ? new PartXXRarBundle(fileMedias) : new NumericRarFileBundle(fileMedias);
};

// src/rar-file-chunk.ts
var RarFileChunk = class _RarFileChunk {
  constructor(fileMedia, startOffset, endOffset) {
    this.fileMedia = fileMedia;
    this.startOffset = startOffset;
    this.endOffset = endOffset;
  }
  padEnd(endPadding) {
    return new _RarFileChunk(
      this.fileMedia,
      this.startOffset,
      this.endOffset - endPadding
    );
  }
  padStart(startPadding) {
    return new _RarFileChunk(
      this.fileMedia,
      this.startOffset + startPadding,
      this.endOffset
    );
  }
  get length() {
    return Math.max(0, this.endOffset - this.startOffset);
  }
  getStream() {
    return this.fileMedia.createReadStream({
      start: this.startOffset,
      end: this.endOffset
    });
  }
};

// src/inner-file-stream.ts
import { Readable } from "stream";
var InnerFileStream = class extends Readable {
  constructor(rarFileChunks, options) {
    super(options);
    this.rarFileChunks = rarFileChunks;
  }
  stream;
  pushData(data) {
    if (!this.push(data)) {
      this.stream?.pause();
    }
  }
  get isStarted() {
    return !!this.stream;
  }
  next() {
    const chunk = this.rarFileChunks.shift();
    if (!chunk) {
      this.push(null);
    } else {
      this.stream = chunk.getStream();
      this.stream?.on("data", (data) => this.pushData(data));
      this.stream?.on("end", () => this.next());
    }
  }
  _read() {
    if (!this.isStarted) {
      this.next();
    } else {
      this.stream?.resume();
    }
  }
};

// src/stream-utils.ts
var streamToBuffer = async (stream) => new Promise((resolve, reject) => {
  const buffers = [];
  stream.on("error", reject);
  stream.on("data", (data) => buffers.push(data));
  stream.on("end", () => resolve(Buffer.concat(buffers)));
});

// src/utils.ts
function groupBy(arr, fn) {
  return arr.reduce((prev, curr) => {
    const groupKey = fn(curr);
    const group = prev[groupKey] || [];
    group.push(curr);
    return { ...prev, [groupKey]: group };
  }, {});
}
function sum(arr) {
  return arr.reduce((s, n) => s + n);
}
function mapValues(object, mapper) {
  return Object.fromEntries(
    Object.entries(object).map(([key, value]) => [key, mapper(value)])
  );
}

// src/inner-file.ts
var InnerFile = class {
  constructor(name, rarFileChunks) {
    this.name = name;
    this.rarFileChunks = rarFileChunks;
    this.length = sum(rarFileChunks.map((c) => c.length));
    this.chunkMap = this.calculateChunkMap(rarFileChunks);
    this.name = name;
  }
  length;
  chunkMap;
  readToEnd() {
    return streamToBuffer(
      this.createReadStream({ start: 0, end: this.length - 1 })
    );
  }
  getChunksToStream(fileStart, fileEnd) {
    const { index: startIndex, start: startOffset } = this.findMappedChunk(fileStart);
    let { index: endIndex, end: endOffset } = this.findMappedChunk(fileEnd);
    const chunksToStream = this.rarFileChunks.slice(startIndex, endIndex + 1);
    const last = chunksToStream.length - 1;
    const first = 0;
    chunksToStream[first] = chunksToStream[first].padStart(
      Math.abs(startOffset - fileStart)
    );
    let diff = Math.abs(endOffset - fileEnd);
    if (diff === this.rarFileChunks.length) {
      diff = 0;
    }
    if (diff !== 0) {
      chunksToStream[last] = chunksToStream[last].padEnd(diff);
    }
    return chunksToStream;
  }
  createReadStream(interval) {
    if (!interval) {
      interval = { start: 0, end: this.length - 1 };
    }
    let { start, end } = interval;
    if (start < 0 || end >= this.length) {
      throw Error("Illegal start/end offset");
    }
    return new InnerFileStream(this.getChunksToStream(start, end));
  }
  calculateChunkMap(rarFileChunks) {
    const chunkMap = [];
    let index = 0;
    let fileOffset = 0;
    for (const chunk of rarFileChunks) {
      const start = fileOffset;
      const end = fileOffset + chunk.length;
      fileOffset = end + 1;
      chunkMap.push({ index, start, end, chunk });
      index++;
    }
    return chunkMap;
  }
  findMappedChunk(offset) {
    let selectedMap = this.chunkMap[0];
    for (const chunkMapping of this.chunkMap) {
      if (offset >= chunkMapping.start && offset <= chunkMapping.end) {
        selectedMap = chunkMapping;
        break;
      }
    }
    return selectedMap;
  }
};

// src/parsing/marker-header-parser.ts
var MarkerHeaderParser = class {
  constructor(headerBuffer) {
    this.headerBuffer = headerBuffer;
  }
  static HEADER_SIZE = 11;
  parse() {
    const crc = this.headerBuffer.readUInt16LE(0);
    const type = this.headerBuffer.readUInt8(2);
    const flags = this.headerBuffer.readUInt16LE(3);
    let size = this.headerBuffer.readUInt16LE(5);
    if ((flags & 32768) !== 0) {
      let addSize = this.headerBuffer.readUint32LE(7);
      size += addSize || 0;
    }
    return { crc, type, flags, size };
  }
};

// src/parsing/archive-header-parser.ts
function parseFlags(parsedVars) {
  return {
    hasVolumeAttributes: (parsedVars.flags & 1) !== 0,
    hasComment: (parsedVars.flags & 2) !== 0,
    isLocked: (parsedVars.flags & 4) !== 0,
    hasSolidAttributes: (parsedVars.flags & 8) !== 0,
    isNewNameScheme: (parsedVars.flags & 16) !== 0,
    hasAuthInfo: (parsedVars.flags & 32) !== 0,
    hasRecovery: (parsedVars.flags & 64) !== 0,
    isBlockEncoded: (parsedVars.flags & 128) !== 0,
    isFirstVolume: (parsedVars.flags & 256) !== 0
  };
}
var ArchiveHeaderParser = class {
  constructor(buffer) {
    this.buffer = buffer;
  }
  static HEADER_SIZE = 13;
  parse() {
    const crc = this.buffer.readUInt16LE(0);
    const type = this.buffer.readUInt8(2);
    const flags = this.buffer.readUInt16LE(3);
    let size = this.buffer.readUInt16LE(5);
    const reserved1 = this.buffer.readUInt16LE(7);
    const reserved2 = this.buffer.readUInt32LE(9);
    let vars = { crc, type, flags, size, reserved1, reserved2 };
    return { ...parseFlags(vars), ...vars };
  }
};

// src/parsing/file-header-parser.ts
var FileHeaderParser = class {
  constructor(buffer) {
    this.buffer = buffer;
  }
  static HEADER_SIZE = 280;
  offset = 0;
  handleHighFileSize(parsedVars) {
    if (parsedVars.hasHighSize) {
      const highPackSize = this.buffer.readInt32LE(this.offset);
      this.offset += 4;
      const highUnpackSize = this.buffer.readInt32LE(this.offset);
      this.offset += 4;
      parsedVars.size = highPackSize * 4294967296 + parsedVars.size;
      parsedVars.unpackedSize = highUnpackSize * 4294967296 + parsedVars.unpackedSize;
    }
  }
  parseFileName(parsedVars) {
    parsedVars.name = this.buffer.subarray(this.offset, this.offset + parsedVars.nameSize).toString("utf-8");
  }
  parseFlags(parsedVars) {
    return {
      continuesFromPrevious: (parsedVars.flags & 1) !== 0,
      continuesInNext: (parsedVars.flags & 2) !== 0,
      isEncrypted: (parsedVars.flags & 4) !== 0,
      hasComment: (parsedVars.flags & 8) !== 0,
      hasInfoFromPrevious: (parsedVars.flags & 16) !== 0,
      hasHighSize: (parsedVars.flags & 256) !== 0,
      hasSpecialName: (parsedVars.flags & 512) !== 0,
      hasSalt: (parsedVars.flags & 1024) !== 0,
      isOldVersion: (parsedVars.flags & 2048) !== 0,
      hasExtendedTime: (parsedVars.flags & 4096) !== 0
    };
  }
  parse() {
    const crc = this.buffer.readUInt16LE(this.offset);
    this.offset += 2;
    const type = this.buffer.readUInt8(this.offset);
    this.offset += 1;
    const flags = this.buffer.readUInt16LE(this.offset);
    this.offset += 2;
    const headSize = this.buffer.readUInt16LE(this.offset);
    this.offset += 2;
    const size = this.buffer.readUInt32LE(this.offset);
    this.offset += 4;
    const unpackedSize = this.buffer.readUInt32LE(this.offset);
    this.offset += 4;
    const host = this.buffer.readUInt8(this.offset);
    this.offset += 1;
    const fileCrc = this.buffer.readUInt32LE(this.offset);
    this.offset += 4;
    const timestamp = this.buffer.readUInt32LE(this.offset);
    this.offset += 4;
    const version = this.buffer.readUInt8(this.offset);
    this.offset += 1;
    const method = this.buffer.readUInt8(this.offset);
    this.offset += 1;
    const nameSize = this.buffer.readUInt16LE(this.offset);
    this.offset += 2;
    const attributes = this.buffer.readUInt32LE(this.offset);
    this.offset += 4;
    let vars = {
      crc,
      type,
      flags,
      headSize,
      size,
      unpackedSize,
      host,
      fileCrc,
      timestamp,
      version,
      method,
      nameSize,
      attributes,
      name: ""
    };
    const boolFlags = this.parseFlags(vars);
    const header = { ...vars, ...boolFlags };
    this.handleHighFileSize(header);
    this.parseFileName(header);
    this.offset = 0;
    return header;
  }
};

// src/parsing/terminator-header-parser.ts
var TerminatorHeaderParser = class {
  constructor(headerBuffer) {
    this.headerBuffer = headerBuffer;
  }
  static HEADER_SIZE = 27;
  parse() {
    const crc = this.headerBuffer.readUInt16LE(0);
    const type = this.headerBuffer.readUInt8(2);
    const flags = this.headerBuffer.readUInt16LE(3);
    const size = this.headerBuffer.readUInt16LE(5);
    return { crc, type, flags, size };
  }
};

// src/rar-files-package.ts
var parseHeader = async (Parser, fileMedia, offset = 0) => {
  const stream = fileMedia.createReadStream({
    start: offset,
    end: offset + Parser.HEADER_SIZE
  });
  const headerBuffer = await streamToBuffer(stream);
  const parser = new Parser(headerBuffer);
  return parser.parse();
};
var RarFilesPackage = class extends EventEmitter {
  rarFileBundle;
  constructor(fileMedias) {
    super();
    this.rarFileBundle = makeRarFileBundle(fileMedias);
  }
  async parseFile(rarFile, opts) {
    const fileChunks = [];
    let fileOffset = 0;
    const markerHead = await parseHeader(MarkerHeaderParser, rarFile);
    fileOffset += markerHead.size;
    const archiveHeader = await parseHeader(
      ArchiveHeaderParser,
      rarFile,
      fileOffset
    );
    fileOffset += archiveHeader.size;
    let countFiles = 0;
    let retrievedFiles = 0;
    while (fileOffset < rarFile.length - TerminatorHeaderParser.HEADER_SIZE) {
      let getFileChunk2 = function() {
        if (fileHead.method !== 48) {
          throw new Error("Decompression is not implemented");
        }
        return {
          name: fileHead.name,
          fileHead,
          chunk: new RarFileChunk(
            rarFile,
            fileOffset,
            fileOffset + fileHead.size - 1
          )
        };
      };
      var getFileChunk = getFileChunk2;
      const fileHead = await parseHeader(FileHeaderParser, rarFile, fileOffset);
      if (fileHead.type !== 116) {
        break;
      }
      fileOffset += fileHead.headSize;
      if (opts.filter) {
        if (opts.filter(fileHead.name, countFiles)) {
          fileChunks.push(getFileChunk2());
          retrievedFiles++;
          if (opts.hasOwnProperty("maxFiles") && retrievedFiles === opts.maxFiles) {
            break;
          }
        }
      } else {
        fileChunks.push(getFileChunk2());
      }
      fileOffset += fileHead.size;
      countFiles++;
    }
    this.emit("file-parsed", rarFile);
    return fileChunks;
  }
  async parse(opts) {
    opts = opts || {};
    this.emit("parsing-start", this.rarFileBundle);
    const parsedFileChunks = [];
    const { files } = this.rarFileBundle;
    for (let i = 0; i < files.length; ++i) {
      const file = files[i];
      const chunks = await this.parseFile(file, opts);
      if (!chunks.length) {
        this.emit("parsing-complete", []);
        return [];
      }
      const { fileHead, chunk } = chunks[chunks.length - 1];
      const chunkSize = Math.abs(chunk.endOffset - chunk.startOffset);
      let innerFileSize = fileHead.unpackedSize;
      parsedFileChunks.push(chunks);
      if (fileHead.continuesInNext) {
        while (Math.abs(innerFileSize - chunkSize) >= chunkSize) {
          const nextFile = files[++i];
          parsedFileChunks.push([
            {
              name: fileHead.name,
              chunk: new RarFileChunk(
                nextFile,
                chunk.startOffset,
                chunk.endOffset
              )
            }
          ]);
          this.emit("file-parsed", nextFile);
          innerFileSize -= chunkSize;
        }
      }
    }
    const fileChunks = parsedFileChunks.flat();
    const grouped = mapValues(
      groupBy(fileChunks, (f) => f.name),
      (value) => value.map((v) => v.chunk)
    );
    const innerFiles = Object.entries(grouped).map(
      ([name, chunks]) => new InnerFile(name, chunks)
    );
    this.emit("parsing-complete", innerFiles);
    return innerFiles;
  }
};

// src/local-file-media.ts
import { basename } from "path";
import { statSync, createReadStream } from "fs";
var LocalFileMedia = class {
  constructor(path) {
    this.path = path;
    this.name = basename(path);
    this.length = statSync(path).size;
  }
  name;
  length;
  createReadStream(interval) {
    return createReadStream(this.path, interval);
  }
};
export {
  LocalFileMedia,
  RarFilesPackage
};
//# sourceMappingURL=index.js.map