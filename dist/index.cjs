"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; } var _class; var _class2; var _class3; var _class4; var _class5; var _class6; var _class7;// src/rar-files-package.ts
var _events = require('events');

// src/rar-file-bundle.ts
var RXX_EXTENSION = /\.R(\d\d)$|.RAR$/i;
var RAR_EXTENSION = /.RAR$/i;
var PARTXX_RAR_EXTENSION = /.PART(\d\d?\d?).RAR/i;
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
      _optionalChain([this, 'access', _2 => _2.stream, 'optionalAccess', _3 => _3.pause, 'call', _4 => _4()]);
    }
  }
  get isStarted() {
    return !!this.stream;
  }
  async next() {
    const chunk = this.rarFileChunks.shift();
    if (!chunk) {
      this.push(null);
    } else {
      this.stream = await chunk.getStream();
      _optionalChain([this, 'access', _5 => _5.stream, 'optionalAccess', _6 => _6.on, 'call', _7 => _7("data", (data) => this.pushData(data))]);
      _optionalChain([this, 'access', _8 => _8.stream, 'optionalAccess', _9 => _9.on, 'call', _10 => _10("end", () => this.next())]);
    }
  }
  _read() {
    if (!this.isStarted) {
      this.next();
    } else {
      _optionalChain([this, 'access', _11 => _11.stream, 'optionalAccess', _12 => _12.resume, 'call', _13 => _13()]);
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
  
  
  async readToEnd() {
    const stream = await this.createReadStream({ start: 0, end: this.length - 1 });
    return streamToBuffer(stream);
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
    return Promise.resolve(
      new InnerFileStream(this.getChunksToStream(start, end))
    );
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
var nodeMajorVersion = parseInt((((process || {}).version || "").split(".")[0] || "").substring(1));
function subarray(buff, start, end) {
  const method = nodeMajorVersion < 16 ? "slice" : "subarray";
  return buff[method](start, end);
}
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
    parsedVars.name = subarray(this.buffer, this.offset, this.offset + parsedVars.nameSize).toString("utf8");
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

// src/parsing-rar5/rawread.js
var RawRead = (_class5 = class _RawRead {
  // rarFile must be an instance of File
  constructor(rarFile) {
    this.srcFile = rarFile;
    this.Data = Buffer.alloc(0);
    this.ReadPos = 0;
  }
  reset() {
    this.Data.fill(null);
    this.ReadPos = 0;
  }
  async Read(size) {
    this.Data = Buffer.concat([this.Data, await this.srcFile.read(size)]);
    return this.Data.length;
  }
  getPos() {
    return this.ReadPos;
  }
  SetPos(Pos) {
    this.ReadPos = Pos;
  }
  Skip(Size) {
    this.ReadPos += Size;
  }
  Size() {
    return this.Data.length;
  }
  DataLeft() {
    return this.Data.length - this.ReadPos;
  }
  getBytes(length) {
    const start = this.ReadPos;
    const end = this.ReadPos + length;
    this.ReadPos += length;
    return Uint8Array.prototype.slice.call(this.Data, start, end);
  }
  // Up to 6 bytes
  _getInteger(bytes) {
    if (this.ReadPos + bytes >= this.Data.length) {
      return 0;
    }
    const Result = this.Data.readUIntLE(this.ReadPos, bytes);
    this.ReadPos += bytes;
    return Result;
  }
  getByte() {
    return this.ReadPos < this.Data.length ? this.Data[this.ReadPos++] : 0;
  }
  getWord() {
    return this._getInteger(2);
  }
  getDword() {
    return this._getInteger(4);
  }
  // Returns a BigInt
  getQword() {
    const low = BigInt(this.getDword());
    const high = BigInt(this.getDword());
    return low + (high << 32n);
  }
  getVarInt() {
    let Result = 0n;
    for (let Shift = 0n; this.ReadPos < this.Data.length && Shift < 64n; Shift += 7n) {
      const Byte = BigInt(this.Data[this.ReadPos++]);
      Result += (Byte & 0x7Fn) << Shift;
      if ((Byte & 0x80n) == 0n)
        break;
    }
    return Number(Result);
  }
  GetCRC50() {
    return _RawRead.CRC32(Uint8Array.prototype.slice.call(this.Data, 4));
  }
  static __initStatic5() {this._CRC_table = new Uint32Array(256).map((_, c) => {
    for (let i = 0; i < 8; i++) {
      c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
    }
    return c;
  })}
  static CRC32(chunk) {
    var crc = 4294967295;
    for (var i = 0, iTop = chunk.length; i < iTop; i++) {
      crc = crc >>> 8 ^ _RawRead._CRC_table[(crc ^ chunk[i]) & 255];
    }
    return (crc ^ -1) >>> 0;
  }
}, _class5.__initStatic5(), _class5);

// src/parsing-rar5/rar5.js
var SIZEOF_SHORTBLOCKHEAD5 = 7;
var HEADER_TYPE = Object.freeze({
  // RAR 5.0 header types.
  HEAD_MAIN: 1,
  HEAD_FILE: 2,
  HEAD_SERVICE: 3,
  HEAD_CRYPT: 4,
  HEAD_ENDARC: 5
});
var HOST_SYSTEM = Object.freeze({
  // RAR 5.0 host OS
  HOST5_WINDOWS: 0,
  HOST5_UNIX: 1
});
var HOST_SYSTEM_TYPE = Object.freeze({
  HSYS_WINDOWS: 0,
  HSYS_UNIX: 1,
  HSYS_UNKNOWN: 2
});
var HFL_EXTRA = 1;
var HFL_DATA = 2;
var HFL_SKIPIFUNKNOWN = 4;
var HFL_SPLITBEFORE = 8;
var HFL_SPLITAFTER = 16;
var HFL_CHILD = 32;
var HFL_INHERITED = 64;
var MHFL_VOLNUMBER = 2;
var FHFL_DIRECTORY = 1;
var FHFL_UTIME = 2;
var FHFL_CRC32 = 4;
var FHFL_UNPUNKNOWN = 8;
var UNPACK_MAX_DICT = 68719476736;
var VER_PACK5 = 50;
var VER_PACK7 = 70;
var VER_UNKNOWN = 9999;
var FCI_RAR5_COMPAT = 1048576;
var EHFL_NEXTVOLUME = 1;
var BaseBlock = (_class6 = class {constructor() { _class6.prototype.__init2.call(this);_class6.prototype.__init3.call(this);_class6.prototype.__init4.call(this);_class6.prototype.__init5.call(this);_class6.prototype.__init6.call(this);_class6.prototype.__init7.call(this);_class6.prototype.__init8.call(this);_class6.prototype.__init9.call(this);_class6.prototype.__init10.call(this);_class6.prototype.__init11.call(this);_class6.prototype.__init12.call(this);_class6.prototype.__init13.call(this);_class6.prototype.__init14.call(this);_class6.prototype.__init15.call(this);_class6.prototype.__init16.call(this);_class6.prototype.__init17.call(this);_class6.prototype.__init18.call(this);_class6.prototype.__init19.call(this);_class6.prototype.__init20.call(this);_class6.prototype.__init21.call(this);_class6.prototype.__init22.call(this);_class6.prototype.__init23.call(this);_class6.prototype.__init24.call(this);_class6.prototype.__init25.call(this);_class6.prototype.__init26.call(this);_class6.prototype.__init27.call(this);_class6.prototype.__init28.call(this);_class6.prototype.__init29.call(this);_class6.prototype.__init30.call(this);_class6.prototype.__init31.call(this);_class6.prototype.__init32.call(this);_class6.prototype.__init33.call(this);_class6.prototype.__init34.call(this); }
  reset() {
    this.headerType = 0;
    this.HeadCRC = 0;
    this.Flags = 0;
    this.HeadSize = 0;
    this.SkipIfUnknow = false;
    this.ExtraSize = 0;
    this.DataSize = 0;
    this.VolNumber = 0;
    this.locator = false;
    this.qopenOffset = 0;
    this.LargeFile = false;
    this.PackSize = 0;
    this.FileFlags = 0;
    this.UnpSize = 0;
    this.UnknownUnpSize = false;
    this.MaxSize = 0;
    this.FileAttr = 0;
    this.FileHash = { type: null, CRC32: 0 };
    this.Method = 0;
    this.UnpVer = 0;
    this.HostOS = 0;
    this.Inherited = false;
    this.HSType = null;
    this.SplitBefore = false;
    this.SplitAfter = false;
    this.SubBlock = false;
    this.Dir = false;
    this.WinSize = 0;
    this.Name = "";
    this.mtime = null;
    this.ctime = null;
    this.atime = null;
    this.NextVolume = false;
  }
  __init2() {this.headerType = 0}
  __init3() {this.HeadCRC = 0}
  __init4() {this.Flags = 0}
  __init5() {this.HeadSize = 0}
  __init6() {this.SkipIfUnknow = false}
  __init7() {this.ExtraSize = 0}
  __init8() {this.DataSize = 0}
  __init9() {this.VolNumber = 0}
  __init10() {this.locator = false}
  __init11() {this.qopenOffset = 0}
  __init12() {this.LargeFile = false}
  __init13() {this.PackSize = 0}
  __init14() {this.FileFlags = 0}
  __init15() {this.UnpSize = 0}
  __init16() {this.UnknownUnpSize = false}
  __init17() {this.MaxSize = 0}
  __init18() {this.FileAttr = 0}
  __init19() {this.FileHash = { type: null, CRC32: 0 }}
  __init20() {this.Method = 0}
  __init21() {this.UnpVer = 0}
  __init22() {this.HostOS = 0}
  __init23() {this.Inherited = false}
  __init24() {this.HSType = null}
  __init25() {this.SplitBefore = false}
  __init26() {this.SplitAfter = false}
  __init27() {this.SubBlock = false}
  __init28() {this.Dir = false}
  __init29() {this.WinSize = 0}
  __init30() {this.Name = ""}
  __init31() {this.mtime = null}
  __init32() {this.ctime = null}
  __init33() {this.atime = null}
  __init34() {this.NextVolume = false}
}, _class6);
var AcRead = (_class7 = class {
  constructor(readable) {;_class7.prototype.__init35.call(this);_class7.prototype.__init36.call(this);_class7.prototype.__init37.call(this);
    this.shortBlock = new BaseBlock();
    this.file = readable;
  }
  __init35() {this.ReadPos = 0}
  __init36() {this.CurBlockPos = 0}
  __init37() {this.NextBlockPos = 0}
  // Borrowed from https://stackoverflow.com/a/46024468/1205681
  static __initStatic6() {this.UNIX_TIME_START = 0x019DB1DED53E8000n}
  //January 1, 1970 (start of Unix epoch) in "ticks"
  static __initStatic7() {this.TICKS_PER_SECOND = 10000n}
  //a tick is 100ns
  async readHeader50(onlySize) {
    const Raw = new RawRead(this.file);
    const FirstReadSize = 7;
    if (await Raw.Read(FirstReadSize) < FirstReadSize) {
      console.log("Failed to read the first block header");
      return 0;
    }
    this.shortBlock.reset();
    this.shortBlock.HeadCRC = Raw.getDword();
    let SizeBytes = Raw.ReadPos;
    const BlockSize = Raw.getVarInt();
    SizeBytes = Raw.ReadPos - SizeBytes;
    if (BlockSize == 0 || SizeBytes == 0) {
      console.log("Block size is 0");
      return 0;
    }
    const SizeToRead = BlockSize - (FirstReadSize - SizeBytes - 4);
    const HeaderSize = 4 + SizeBytes + BlockSize;
    if (onlySize)
      return HeaderSize;
    if (SizeToRead < 0 || HeaderSize < SIZEOF_SHORTBLOCKHEAD5) {
      console.log("Invalid block size or header size");
      return 0;
    }
    await Raw.Read(SizeToRead);
    if (Raw.Size() < HeaderSize) {
      console.log("Failed to read the entire block header");
      return 0;
    }
    const HeaderCRC = Raw.GetCRC50();
    const NextPos = Raw.ReadPos + BlockSize;
    this.shortBlock.headerType = Raw.getVarInt();
    this.shortBlock.Flags = Raw.getVarInt();
    this.shortBlock.SkipIfUnknow = (this.shortBlock.Flags & HFL_SKIPIFUNKNOWN) != 0;
    this.shortBlock.HeadSize = HeaderSize;
    this.CurHeaderType = this.shortBlock.headerType;
    const BadCRC = this.shortBlock.HeadCRC != HeaderCRC;
    if (BadCRC) {
      console.log("Bad CRC");
    }
    this.shortBlock.ExtraSize = (this.shortBlock.Flags & HFL_EXTRA) != 0 ? Raw.getVarInt() : 0;
    if (this.shortBlock.ExtraSize >= this.shortBlock.HeadSize) {
      console.log("Extra size is too large");
      return 0;
    }
    this.shortBlock.DataSize = (this.shortBlock.Flags & HFL_DATA) != 0 ? Raw.getVarInt() : 0;
    this.NextBlockPos = this.CurBlockPos + this.shortBlock.HeadSize + this.shortBlock.DataSize || 0;
    switch (this.shortBlock.headerType) {
      case HEADER_TYPE.HEAD_CRYPT: {
        console.log("Crypt header");
        break;
      }
      case HEADER_TYPE.HEAD_MAIN: {
        const ArcFlags2 = Raw.getVarInt();
        this.shortBlock.VolNumber = (ArcFlags2 & MHFL_VOLNUMBER) != 0 ? Raw.getVarInt() : 0;
        break;
      }
      case HEADER_TYPE.HEAD_FILE:
      case HEADER_TYPE.HEAD_SERVICE: {
        const FileBlock = this.shortBlock.headerType == HEADER_TYPE.HEAD_FILE;
        this.shortBlock.LargeFile = true;
        this.shortBlock.PackSize = this.shortBlock.DataSize;
        this.shortBlock.FileFlags = Raw.getVarInt();
        this.shortBlock.UnpSize = Raw.getVarInt();
        this.shortBlock.UnknownUnpSize = (this.shortBlock.FileFlags & FHFL_UNPUNKNOWN) != 0;
        if (this.shortBlock.UnknownUnpSize) {
          this.shortBlock.UnpSize = Infinity;
        }
        this.shortBlock.MaxSize = Math.max(this.shortBlock.UnpSize, this.shortBlock.PackSize);
        this.shortBlock.FileAttr = Raw.getVarInt();
        if ((this.shortBlock.FileFlags & FHFL_UTIME) != 0)
          this.shortBlock.mtime = new Date(Raw.getDword() * 1e3);
        this.shortBlock.FileHash = {
          type: null,
          CRC32: null
        };
        if ((this.shortBlock.FileFlags & FHFL_CRC32) != 0) {
          this.shortBlock.FileHash.type = "crc32";
          this.shortBlock.FileHash.CRC32 = Raw.getDword();
        }
        const CompInfo = Raw.getVarInt();
        this.shortBlock.Method = CompInfo >> 7 & 7;
        const UnpVer = CompInfo & 63;
        if (UnpVer == 0) {
          this.shortBlock.UnpVer = VER_PACK5;
        } else if (UnpVer == 1) {
          this.shortBlock.UnpVer = VER_PACK7;
        } else {
          this.shortBlock.UnpVer = VER_UNKNOWN;
        }
        this.shortBlock.HostOS = Raw.getVarInt();
        const NameSize = Raw.getVarInt();
        this.shortBlock.Inherited = (this.shortBlock.Flags & HFL_INHERITED) != 0;
        this.shortBlock.HSType = HOST_SYSTEM_TYPE.HSYS_UNKNOWN;
        if (this.shortBlock.HostOS == HOST_SYSTEM.HOST5_UNIX) {
          this.shortBlock.HSType = HOST_SYSTEM.HSYS_UNIX;
        } else if (this.shortBlock.HostOS == HOST_SYSTEM.HOST5_WINDOWS) {
          this.shortBlock.HSType = HOST_SYSTEM_TYPE.HSYS_WINDOWS;
        }
        this.shortBlock.SplitBefore = (this.shortBlock.Flags & HFL_SPLITBEFORE) != 0;
        this.shortBlock.SplitAfter = (this.shortBlock.Flags & HFL_SPLITAFTER) != 0;
        this.shortBlock.SubBlock = (this.shortBlock.Flags & HFL_CHILD) != 0;
        this.shortBlock.Dir = (this.shortBlock.FileFlags & FHFL_DIRECTORY) != 0;
        if (this.shortBlock.Dir || UnpVer > 1) {
          this.shortBlock.WinSize = 0;
        } else {
          this.shortBlock.WinSize = 131072 << (CompInfo >> 10 & (UnpVer == 0 ? 15 : 31));
          if (UnpVer == 1) {
            this.shortBlock.WinSize += this.shortBlock.WinSize / 32 * (CompInfo >> 15 & 31);
            if ((CompInfo & FCI_RAR5_COMPAT) != 0)
              this.shortBlock.UnpVer = VER_PACK5;
            if (this.shortBlock.WinSize > UNPACK_MAX_DICT)
              this.shortBlock.UnpVer = VER_UNKNOWN;
          }
        }
        this.shortBlock.Name = Raw.getBytes(NameSize).toString();
        break;
      }
      case HEADER_TYPE.HEAD_ENDARC:
        const ArcFlags = Raw.getVarInt();
        this.shortBlock.NextVolume = (ArcFlags & EHFL_NEXTVOLUME) != 0;
        break;
      default:
        console.log("Unknown header", this.shortBlock.headerType.toString(16), "at offset", this.ReadPos.toString(16));
        break;
    }
    return {
      crc: this.shortBlock.HeadCRC,
      type: this.shortBlock.headerType,
      flags: this.shortBlock.Flags,
      headSize: this.shortBlock.HeadSize,
      size: this.shortBlock.DataSize,
      unpackedSize: this.shortBlock.UnpSize,
      host: this.shortBlock.HostOS,
      fileCrc: this.shortBlock.FileHash.CRC32,
      timestamp: 0,
      version: this.shortBlock.UnpVer,
      method: this.shortBlock.Method,
      nameSize: 0,
      attributes: this.shortBlock.FileAttr,
      name: this.shortBlock.Name,
      continuesFromPrevious: false,
      continuesInNext: this.shortBlock.Flags === 27 || this.shortBlock.Flags === 26,
      isEncrypted: false,
      hasComment: false,
      hasInfoFromPrevious: false,
      hasHighSize: false,
      hasSpecialName: false,
      hasSalt: false,
      isOldVersion: false,
      hasExtendedTime: false
    };
  }
}, _class7.__initStatic6(), _class7.__initStatic7(), _class7);
function readHeaderSize50(readable) {
  const rar = new AcRead(readable);
  return rar.readHeader50(true);
}
function readHeader50(readable) {
  const rar = new AcRead(readable);
  return rar.readHeader50();
}

// src/rar-files-package.ts
var parseHeader = async (Parser, fileMedia, offset = 0) => {
  const stream = await fileMedia.createReadStream({
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
    const stream = await rarFile.createReadStream({
      start: 0,
      end: 6
    });
    const headerBuffer = await streamToBuffer(stream);
    if (headerBuffer.equals(Buffer.from([82, 97, 114, 33, 26, 7, 1]))) {
      fileOffset += 8;
      let headSizeOffset = fileOffset;
      const markerHeaderSize = await readHeaderSize50({
        read: async (size) => {
          const readable = await rarFile.createReadStream({
            start: headSizeOffset,
            end: headSizeOffset + size - 1
          });
          headSizeOffset += size;
          return streamToBuffer(readable);
        }
      });
      fileOffset += markerHeaderSize;
      let countFiles = 0;
      let retrievedFiles = 0;
      while (fileOffset < rarFile.length - TerminatorHeaderParser.HEADER_SIZE) {
        let getFileChunk2 = function() {
          if (fileHead.method !== 0) {
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
        let fileHeadOffset = fileOffset;
        const fileHead = await readHeader50({
          read: async (size) => {
            const readable = await rarFile.createReadStream({
              start: fileHeadOffset,
              end: fileHeadOffset + size - 1
            });
            fileHeadOffset += size;
            return streamToBuffer(readable);
          }
        });
        if (fileHead.type !== 2) {
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
    } else {
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
    return Promise.resolve(
      _fs.createReadStream.call(void 0, this.path, interval)
    );
  }
};



exports.LocalFileMedia = LocalFileMedia; exports.RarFilesPackage = RarFilesPackage;
//# sourceMappingURL=index.cjs.map