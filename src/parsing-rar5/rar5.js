// @ts-nocheck

import { RawRead } from './rawread.js'

const SIZEOF_SHORTBLOCKHEAD5 = 7  // Smallest RAR 5.0 block size.

const HEADER_TYPE = Object.freeze({
    // RAR 5.0 header types.
    HEAD_MAIN: 0x01, HEAD_FILE: 0x02, HEAD_SERVICE: 0x03,
    HEAD_CRYPT: 0x04, HEAD_ENDARC: 0x05,
})

const HOST_SYSTEM = Object.freeze({
    // RAR 5.0 host OS
    HOST5_WINDOWS: 0, HOST5_UNIX: 1,
})
const HOST_SYSTEM_TYPE = Object.freeze({
    HSYS_WINDOWS: 0,
    HSYS_UNIX: 1,
    HSYS_UNKNOWN: 2
})

// Additional extra area is present in the end of block header.
const HFL_EXTRA = 0x0001
// Additional data area is present in the end of block header.
const HFL_DATA = 0x0002
// Unknown blocks with this flag must be skipped when updating an archive.
const HFL_SKIPIFUNKNOWN = 0x0004
// Data area of this block is continuing from previous volume.
const HFL_SPLITBEFORE = 0x0008
// Data area of this block is continuing in next volume.
const HFL_SPLITAFTER = 0x0010
// Block depends on preceding file block.
const HFL_CHILD = 0x0020
// Preserve a child block if host is modified.
const HFL_INHERITED = 0x0040

// RAR 5.0 main archive header specific flags.
const MHFL_VOLNUMBER = 0x0002 // Volume number field is present. True for all volumes except first.

// RAR 5.0 file header specific flags.
const FHFL_DIRECTORY = 0x0001 // Directory.
const FHFL_UTIME = 0x0002 // Time field in Unix format is present.
const FHFL_CRC32 = 0x0004 // CRC32 field is present.
const FHFL_UNPUNKNOWN = 0x0008 // Unknown unpacked size.

// Maximum dictionary allowed by decompression.
const UNPACK_MAX_DICT = 0x1000000000 // 64 GB.

const VER_PACK5 = 50 // It is stored as 0, but we subtract 50 when saving an archive.
const VER_PACK7 = 70 // It is stored as 1, but we subtract 70 when saving an archive.
const VER_UNKNOWN = 9999 // Just some large value.

const FCI_RAR5_COMPAT = 0x00100000 // RAR7 compression flags and RAR5 compression algorithm.

// RAR 5.0 end of archive header specific flags.
const EHFL_NEXTVOLUME = 0x0001 // Not last volume.


class BaseBlock {
    reset() {
        this.headerType = 0
        this.HeadCRC = 0
        this.Flags = 0
        this.HeadSize = 0
        this.SkipIfUnknow = false
        this.ExtraSize = 0
        this.DataSize = 0
        this.VolNumber = 0
        this.locator = false
        this.qopenOffset = 0
        this.LargeFile = false
        this.PackSize = 0
        this.FileFlags = 0
        this.UnpSize = 0
        this.UnknownUnpSize = false
        this.MaxSize = 0
        this.FileAttr = 0
        this.FileHash = { type: null, CRC32: 0 }
        this.Method = 0
        this.UnpVer = 0
        this.HostOS = 0
        this.Inherited = false
        this.HSType = null
        this.SplitBefore = false
        this.SplitAfter = false
        this.SubBlock = false
        this.Dir = false
        this.WinSize = 0
        this.Name = ''
        this.mtime = null
        this.ctime = null
        this.atime = null
        this.NextVolume = false
    }
    headerType = 0
    HeadCRC = 0
    Flags = 0
    HeadSize = 0
    SkipIfUnknow = false
    ExtraSize = 0
    DataSize = 0
    VolNumber = 0
    locator = false
    qopenOffset = 0
    LargeFile = false
    PackSize = 0
    FileFlags = 0
    UnpSize = 0
    UnknownUnpSize = false
    MaxSize = 0
    FileAttr = 0
    FileHash = { type: null, CRC32: 0 }
    Method = 0
    UnpVer = 0
    HostOS = 0
    Inherited = false
    HSType = null
    SplitBefore = false
    SplitAfter = false
    SubBlock = false
    Dir = false
    WinSize = 0
    Name = ''
    mtime = null
    ctime = null
    atime = null
    NextVolume = false
}

class AcRead {
    constructor(readable) {
        this.shortBlock = new BaseBlock()
        this.file = readable
    }
    ReadPos = 0
    CurBlockPos = 0
    NextBlockPos = 0

    // Borrowed from https://stackoverflow.com/a/46024468/1205681
    static UNIX_TIME_START = 0x019DB1DED53E8000n //January 1, 1970 (start of Unix epoch) in "ticks"
    static TICKS_PER_SECOND = 10000n; //a tick is 100ns

    async readHeader50(onlySize) {
        const Raw = new RawRead(this.file)

        // Header size must not occupy more than 3 variable length integer bytes
        // resulting in 2 MB maximum header size (MAX_HEADER_SIZE_RAR5),
        // so here we read 4 byte CRC32 followed by 3 bytes or less of header size.
        const FirstReadSize = 7 // Smallest possible block size.
        if (await Raw.Read(FirstReadSize) < FirstReadSize) {
            console.log('Failed to read the first block header')
            return 0
        }
        this.shortBlock.reset()
        this.shortBlock.HeadCRC = Raw.getDword()
        let SizeBytes = Raw.ReadPos
        const BlockSize = Raw.getVarInt()
        SizeBytes = Raw.ReadPos - SizeBytes

        if (BlockSize == 0 || SizeBytes == 0) {
            console.log('Block size is 0')
            return 0;
        }

        const SizeToRead = BlockSize - (FirstReadSize - SizeBytes - 4) // Adjust overread size bytes if any.
        const HeaderSize = 4 + SizeBytes + BlockSize;

        if (onlySize)
            return HeaderSize

        if (SizeToRead < 0 || HeaderSize < SIZEOF_SHORTBLOCKHEAD5) {
            console.log('Invalid block size or header size')
            return 0;
        }

        await Raw.Read(SizeToRead)

        if (Raw.Size() < HeaderSize) {
            console.log('Failed to read the entire block header')
            return 0;
        }

        const HeaderCRC = Raw.GetCRC50()

        const NextPos = Raw.ReadPos + BlockSize

        this.shortBlock.headerType = Raw.getVarInt()
        this.shortBlock.Flags = Raw.getVarInt()
        this.shortBlock.SkipIfUnknow = (this.shortBlock.Flags & HFL_SKIPIFUNKNOWN) != 0
        this.shortBlock.HeadSize = HeaderSize

        this.CurHeaderType = this.shortBlock.headerType

        const BadCRC = (this.shortBlock.HeadCRC != HeaderCRC)
        if (BadCRC) {
            console.log('Bad CRC') // Report, but attempt to process.
        }

        this.shortBlock.ExtraSize = ((this.shortBlock.Flags & HFL_EXTRA) != 0) ? Raw.getVarInt() : 0
        if (this.shortBlock.ExtraSize >= this.shortBlock.HeadSize) {
            console.log('Extra size is too large')
            return 0
        }
        this.shortBlock.DataSize = ((this.shortBlock.Flags & HFL_DATA) != 0) ? Raw.getVarInt() : 0

        this.NextBlockPos = this.CurBlockPos + this.shortBlock.HeadSize + this.shortBlock.DataSize || 0

        switch (this.shortBlock.headerType) {
            case HEADER_TYPE.HEAD_CRYPT: {
                console.log('Crypt header')
                break
            }
            case HEADER_TYPE.HEAD_MAIN: {
                const ArcFlags = Raw.getVarInt()

                this.shortBlock.VolNumber = ((ArcFlags & MHFL_VOLNUMBER) != 0) ? Raw.getVarInt() : 0

                break
            }
            case HEADER_TYPE.HEAD_FILE:
            case HEADER_TYPE.HEAD_SERVICE: {
                const FileBlock = this.shortBlock.headerType == HEADER_TYPE.HEAD_FILE

                this.shortBlock.LargeFile = true

                this.shortBlock.PackSize = this.shortBlock.DataSize
                this.shortBlock.FileFlags = Raw.getVarInt()
                this.shortBlock.UnpSize = Raw.getVarInt()
                this.shortBlock.UnknownUnpSize = (this.shortBlock.FileFlags & FHFL_UNPUNKNOWN) != 0
                if (this.shortBlock.UnknownUnpSize) {
                    this.shortBlock.UnpSize = Infinity
                }
                this.shortBlock.MaxSize = Math.max(this.shortBlock.UnpSize, this.shortBlock.PackSize)
                this.shortBlock.FileAttr = Raw.getVarInt()
                if ((this.shortBlock.FileFlags & FHFL_UTIME) != 0)
                    this.shortBlock.mtime = new Date(Raw.getDword() * 1000)

                this.shortBlock.FileHash = {
                    type: null,
                    CRC32: null,
                }
                if ((this.shortBlock.FileFlags & FHFL_CRC32) != 0) {
                    this.shortBlock.FileHash.type = 'crc32'
                    this.shortBlock.FileHash.CRC32 = Raw.getDword()
                }

                const CompInfo = Raw.getVarInt()
                this.shortBlock.Method = (CompInfo >> 7) & 7
                const UnpVer = CompInfo & 0x3f
                if (UnpVer == 0) {
                    this.shortBlock.UnpVer = VER_PACK5
                } else if (UnpVer == 1) {
                    this.shortBlock.UnpVer = VER_PACK7
                } else {
                    this.shortBlock.UnpVer = VER_UNKNOWN
                }

                this.shortBlock.HostOS = Raw.getVarInt()
                const NameSize = Raw.getVarInt()
                this.shortBlock.Inherited = (this.shortBlock.Flags & HFL_INHERITED) != 0

                this.shortBlock.HSType = HOST_SYSTEM_TYPE.HSYS_UNKNOWN
                if (this.shortBlock.HostOS == HOST_SYSTEM.HOST5_UNIX) { // Unix
                    this.shortBlock.HSType = HOST_SYSTEM.HSYS_UNIX
                } else if (this.shortBlock.HostOS == HOST_SYSTEM.HOST5_WINDOWS) { // Windows
                    this.shortBlock.HSType = HOST_SYSTEM_TYPE.HSYS_WINDOWS
                }

                this.shortBlock.SplitBefore = (this.shortBlock.Flags & HFL_SPLITBEFORE) != 0;
                this.shortBlock.SplitAfter = (this.shortBlock.Flags & HFL_SPLITAFTER) != 0;
                this.shortBlock.SubBlock = (this.shortBlock.Flags & HFL_CHILD) != 0;
                // this.shortBlock.Solid=(FileBlock && (CompInfo & FCI_SOLID)!=0;
                this.shortBlock.Dir = (this.shortBlock.FileFlags & FHFL_DIRECTORY) != 0;
                if (this.shortBlock.Dir || UnpVer > 1) {
                    this.shortBlock.WinSize = 0
                } else {
                    this.shortBlock.WinSize = 0x20000 << ((CompInfo >> 10) & (UnpVer == 0 ? 0x0f : 0x1f))
                    if (UnpVer == 1) {
                        this.shortBlock.WinSize += this.shortBlock.WinSize / 32 * ((CompInfo >> 15) & 0x1f)

                        // RAR7 header with RAR5 compression. Needed to append RAR7 files
                        // to RAR5 solid stream if new dictionary is larger than existing.
                        if ((CompInfo & FCI_RAR5_COMPAT) != 0)
                            this.shortBlock.UnpVer = VER_PACK5
                        if (this.shortBlock.WinSize > UNPACK_MAX_DICT)
                            this.shortBlock.UnpVer = VER_UNKNOWN
                    }
                }

                this.shortBlock.Name = Raw.getBytes(NameSize).toString()

                break
            }
            case HEADER_TYPE.HEAD_ENDARC:
                const ArcFlags = Raw.getVarInt()
                this.shortBlock.NextVolume = (ArcFlags & EHFL_NEXTVOLUME) != 0
                break
            default:
                console.log('Unknown header', this.shortBlock.headerType.toString(16), 'at offset', this.ReadPos.toString(16))
                break
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
          hasExtendedTime: false,
        }
    }
};

function readHeaderSize50(readable) {
    const rar = new AcRead(readable)
    return rar.readHeader50(true)
}
function readHeader50 (readable) {
    const rar = new AcRead(readable)
    return rar.readHeader50()
}

export { readHeaderSize50, readHeader50 }
