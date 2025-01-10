// @ts-nocheck

class RawRead {
    // rarFile must be an instance of File
    constructor(rarFile) {
        this.srcFile = rarFile
        this.Data = Buffer.alloc(0)
        this.ReadPos = 0
    }
    reset() {
        this.Data.fill(null);
        this.ReadPos = 0;
    }
    async Read(size) {
        this.Data = Buffer.concat([this.Data, await this.srcFile.read(size)])
        return this.Data.length
    }
    getPos() { return this.ReadPos }
    SetPos(Pos) { this.ReadPos = Pos }
    Skip(Size) { this.ReadPos += Size }
    Size() { return this.Data.length }
    DataLeft() { return this.Data.length - this.ReadPos }
    getBytes(length) {
        const start = this.ReadPos
        const end = this.ReadPos + length
        this.ReadPos += length
        return Uint8Array.prototype.slice.call(this.Data, start, end)
    }
    // Up to 6 bytes
    _getInteger(bytes) {
        if (this.ReadPos + bytes >= this.Data.length) {
            return 0
        }
        const Result = this.Data.readUIntLE(this.ReadPos, bytes)
        this.ReadPos += bytes
        return Result
    }
    getByte() {
        return this.ReadPos<this.Data.length ? this.Data[this.ReadPos++] : 0
    }
    getWord() {
        return this._getInteger(2)
    }
    getDword() {
        return this._getInteger(4)
    }
    // Returns a BigInt
    getQword() {
        const low = BigInt(this.getDword())
        const high = BigInt(this.getDword())
        return low + (high << 32n)
    }
    getVarInt() {
        let Result = 0n
        for (let Shift = 0n;this.ReadPos < this.Data.length && Shift < 64n;Shift += 7n) {
            const Byte = BigInt(this.Data[this.ReadPos++])
            Result += (Byte & 0x7Fn) << Shift
            if ((Byte & 0x80n) == 0n) break
        }
        return Number(Result)
    }

    GetCRC50() {
        return RawRead.CRC32(Uint8Array.prototype.slice.call(this.Data, 4))
    }

    static _CRC_table = new Uint32Array(256).map((_, c) => {
        for (let i = 0;i < 8;i++) {
            c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1))
        }
        return c;
    })

    static CRC32(chunk) {
        var crc = 0xffffffff;
        for (var i = 0, iTop = chunk.length;i < iTop;i++) {
            crc = (crc >>> 8) ^ RawRead._CRC_table[(crc ^ chunk[i]) & 0xFF];
        }
        return (crc ^ (-1)) >>> 0;
    }
}

export { RawRead }
