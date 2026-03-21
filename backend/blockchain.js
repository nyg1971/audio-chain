const crypto = require("crypto");

class Block {
  constructor(index, data, previousHash) {
    this.index = index;
    this.timestamp = new Date().toISOString();
    this.data = data;
    this.previousHash = previousHash;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    // JSON.stringify でオブジェクトごとシリアライズ
    // → キー名が区切りとして機能しフィールド境界の曖昧さを排除
    const content = JSON.stringify({
      index: this.index,
      timestamp: this.timestamp,
      data: this.data,
      previousHash: this.previousHash,
    });
    return crypto.createHash("sha256").update(content).digest("hex");
  }
}

class Blockchain {
  constructor() {
    this.chain = [this.createGenesisBlock()];
  }

  createGenesisBlock() {
    return new Block(0, { message: "Genesis Block" }, "0");
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  addBlock(data) {
    const prev = this.getLatestBlock();
    const block = new Block(this.chain.length, data, prev.hash);
    this.chain.push(block);
    return block;
  }

  isValid() {
    for (let i = 0; i < this.chain.length; i++) {
      const current = this.chain[i];
      if (current.hash !== current.calculateHash()) return false;
      if (i > 0 && current.previousHash !== this.chain[i - 1].hash) return false;
    }
    return true;
  }

  getChain() {
    return this.chain;
  }
}

const instance = new Blockchain();

module.exports = { Block, Blockchain, instance };
