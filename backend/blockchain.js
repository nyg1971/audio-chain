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
    // TODO(BE-009): 文字列結合はフィールド境界が曖昧になりハッシュ衝突のリスクがある
    // → JSON.stringify でオブジェクトごとシリアライズする方式に変更予定
    const content =
      this.index +
      this.timestamp +
      JSON.stringify(this.data) +
      this.previousHash;
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
    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const previous = this.chain[i - 1];
      if (current.hash !== current.calculateHash()) return false;
      if (current.previousHash !== previous.hash) return false;
    }
    return true;
  }

  getChain() {
    return this.chain;
  }
}

module.exports = new Blockchain();
