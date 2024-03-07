import { EventEmitter } from 'events';
import { Readable, ReadableOptions } from 'stream';
import * as fs from 'fs';

interface IFileHeaderFlags {
    continuesFromPrevious: boolean;
    continuesInNext: boolean;
    isEncrypted: boolean;
    hasComment: boolean;
    hasInfoFromPrevious: boolean;
    hasHighSize: boolean;
    hasSpecialName: boolean;
    hasSalt: boolean;
    isOldVersion: boolean;
    hasExtendedTime: boolean;
}
interface IFileHeaderRaw {
    crc: number;
    type: number;
    flags: number;
    headSize: number;
    size: number;
    unpackedSize: number;
    host: number;
    fileCrc: number;
    timestamp: number;
    version: number;
    method: number;
    nameSize: number;
    attributes: number;
    name: string;
}
type IFileHeader = IFileHeaderRaw & IFileHeaderFlags;

interface IFileMedia {
    length: number;
    name: string;
    createReadStream(opts?: IReadInterval): NodeJS.ReadableStream;
}
interface IReadInterval {
    start: number;
    end: number;
}
interface FindOpts {
    filter(filename: string, idx: number): boolean;
    maxFiles: number;
}

declare class NumericRarFileBundle {
    private fileMedias;
    constructor(fileMedias?: IFileMedia[]);
    filter(): void;
    sort(): void;
    get length(): number;
    get fileNames(): string[];
    get files(): IFileMedia[];
}
declare class PartXXRarBundle {
    private fileMedias;
    constructor(fileMedias?: IFileMedia[]);
    filter(): void;
    sort(): void;
    get length(): number;
    get fileNames(): string[];
    get files(): IFileMedia[];
}
type RarFileBundle = PartXXRarBundle | NumericRarFileBundle;

declare class RarFileChunk {
    private fileMedia;
    startOffset: number;
    endOffset: number;
    constructor(fileMedia: IFileMedia, startOffset: number, endOffset: number);
    padEnd(endPadding: number): RarFileChunk;
    padStart(startPadding: number): RarFileChunk;
    get length(): number;
    getStream(): NodeJS.ReadableStream;
}

declare class InnerFileStream extends Readable {
    private rarFileChunks;
    stream?: NodeJS.ReadableStream;
    constructor(rarFileChunks: RarFileChunk[], options?: ReadableOptions);
    pushData(data: Uint16Array): void;
    get isStarted(): boolean;
    next(): void;
    _read(): void;
}

type ChunkMapEntry = {
    index: number;
    start: number;
    end: number;
    chunk: RarFileChunk;
};
declare class InnerFile implements IFileMedia {
    name: string;
    private rarFileChunks;
    length: number;
    chunkMap: ChunkMapEntry[];
    constructor(name: string, rarFileChunks: RarFileChunk[]);
    readToEnd(): Promise<Buffer>;
    getChunksToStream(fileStart: number, fileEnd: number): RarFileChunk[];
    createReadStream(interval: IReadInterval): InnerFileStream;
    calculateChunkMap(rarFileChunks: RarFileChunk[]): ChunkMapEntry[];
    findMappedChunk(offset: number): ChunkMapEntry;
}

interface ParsedFileChunkMapping {
    name: string;
    chunk: RarFileChunk;
}
interface FileChunkMapping extends ParsedFileChunkMapping {
    fileHead: IFileHeader;
}
declare class RarFilesPackage extends EventEmitter {
    rarFileBundle: RarFileBundle;
    constructor(fileMedias: IFileMedia[]);
    parseFile(rarFile: IFileMedia, opts: FindOpts): Promise<FileChunkMapping[]>;
    parse(opts: FindOpts): Promise<InnerFile[]>;
}

declare class LocalFileMedia implements IFileMedia {
    private path;
    name: string;
    length: number;
    constructor(path: string);
    createReadStream(interval: IReadInterval): fs.ReadStream;
}

export { LocalFileMedia, RarFilesPackage };
