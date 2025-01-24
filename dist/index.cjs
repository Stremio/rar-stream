"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; } var _class; var _class2; var _class3; var _class4;// src/rar-files-package.ts
var _events = require('events');

// src/rar-file-bundle.ts
var RXX_EXTENSION = /\.R(\d\d)$|.RAR$/i;
var RAR_EXTENSION = /.RAR$/i;
var PARTXX_RAR_EXTENSION = /.PART(\d\d).RAR/i;
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
var _stream = require('stream');
var InnerFileStream = class extends _stream.Readable {
  constructor(rarFileChunks, options) {
    super(options);
    this.rarFileChunks = rarFileChunks;
  }
  
  pushData(data) {
    if (!this.push(data)) {
      _optionalChain([this, 'access', _ => _.stream, 'optionalAccess', _2 => _2.pause, 'call', _3 => _3()]);
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
      _optionalChain([this, 'access', _4 => _4.stream, 'optionalAccess', _5 => _5.on, 'call', _6 => _6("data", (data) => this.pushData(data))]);
      _optionalChain([this, 'access', _7 => _7.stream, 'optionalAccess', _8 => _8.on, 'call', _9 => _9("end", () => this.next())]);
    }
  }
  _read() {
    if (!this.isStarted) {
      this.next();
    } else {
      _optionalChain([this, 'access', _10 => _10.stream, 'optionalAccess', _11 => _11.resume, 'call', _12 => _12()]);
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
var MarkerHeaderParser = (_class = class {
  constructor(headerBuffer) {
    this.headerBuffer = headerBuffer;
  }
  static __initStatic() {this.HEADER_SIZE = 11}
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
}, _class.__initStatic(), _class);

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
var ArchiveHeaderParser = (_class2 = class {
  constructor(buffer) {
    this.buffer = buffer;
  }
  static __initStatic2() {this.HEADER_SIZE = 13}
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
}, _class2.__initStatic2(), _class2);

// src/parsing/file-header-parser.ts
var FileHeaderParser = (_class3 = class {
  constructor(buffer) {;_class3.prototype.__init.call(this);
    this.buffer = buffer;
  }
  static __initStatic3() {this.HEADER_SIZE = 280}
  __init() {this.offset = 0}
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
}, _class3.__initStatic3(), _class3);

// src/parsing/terminator-header-parser.ts
var TerminatorHeaderParser = (_class4 = class {
  constructor(headerBuffer) {
    this.headerBuffer = headerBuffer;
  }
  static __initStatic4() {this.HEADER_SIZE = 27}
  parse() {
    const crc = this.headerBuffer.readUInt16LE(0);
    const type = this.headerBuffer.readUInt8(2);
    const flags = this.headerBuffer.readUInt16LE(3);
    const size = this.headerBuffer.readUInt16LE(5);
    return { crc, type, flags, size };
  }
}, _class4.__initStatic4(), _class4);

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
var RarFilesPackage = class extends _events.EventEmitter {
  
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
var _path = require('path');
var _fs = require('fs');
var LocalFileMedia = class {
  constructor(path) {
    this.path = path;
    this.name = _path.basename.call(void 0, path);
    this.length = _fs.statSync.call(void 0, path).size;
  }
  
  
  createReadStream(interval) {
    return _fs.createReadStream.call(void 0, this.path, interval);
  }
};



exports.LocalFileMedia = LocalFileMedia; exports.RarFilesPackage = RarFilesPackage;
//# sourceMappingURL=index.cjs.map