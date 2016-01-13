import {Readable} from "stream";

export default class AbstractParser {
  constructor(stream) {
    if (!(stream instanceof Readable)) {
      throw Error("Invalid Arguments, stream needs to be a ReadableStream instance");
    }
    this._stream = stream;
  }
  get size() {
    throw Error("Abstract Getter, implement in sub classes");
  }
  parse() {
    throw Error("Abstract Method, implement in sub classes");
  }
  read() {
    if (!this._size || Number.isNaN(this._size) || this._size < 0) {
      throw Error("Invalid Size, size need to be a positive number");
    }
    return this._stream.read(this.size);
  }
}