# CashStream Protocol

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CashScript](https://img.shields.io/badge/CashScript-v0.14.0-10b981.svg)](contracts/)
[![Vitest](https://img.shields.io/badge/Tests-11%2F11_Passing-brightgreen.svg)](tests/)
[![Live Chipnet UI](https://img.shields.io/badge/GitHub_Pages-Chipnet_UI-0ea5e9.svg)](https://khanhtnq.github.io/bch-blaze-cashstream/)

**CashStream Protocol** is an autonomous **Bitcoin Cash (BCH) CashTokens linear streaming covenant and multi-tranche milestone escrow protocol** built with CashScript `^0.14.0` and native UTXO transaction introspection.

---

## Smart Contract Architecture

### 1. `CashStreamVault` (`contracts/CashStreamVault.cash`)
- **Compiled Footprint:** `212` opcodes (`338` bytes native BCH locking script).
- **CashTokens Category Guard:** Enforces `tx.inputs[this.activeInputIndex].tokenCategory == streamCategoryId` via native UTXO introspection.
- **Continuous Block-by-Block Linear Vesting:** Enforces `tx.time >= claimTime` timelock invariants and exact proportional payout math.
- **Self-Reproducing Covenant State:** Verifies `tx.outputs[0].lockingBytecode == tx.inputs[this.activeInputIndex].lockingBytecode` and mutable NFT commitment progression while disbursing vested satoshis to the recipient's P2PKH output.
- **Sender Clawback Safety:** Permits unvested capital recovery while strictly preserving accrued recipient claims.

### 2. `MilestoneEscrow` (`contracts/MilestoneEscrow.cash`)
- **Compiled Footprint:** `148` opcodes (`240` bytes native BCH locking script).
- **Multi-Phase Settlement:** Deterministic milestone release covenant with independent arbiter dispute resolution and timelocked expiration refunds.

---

## Quick Start & Verification

```bash
npm install
npm test
```

- **Automated Test Suite (`11/11` Vitest Passing):** Validates linear vesting boundaries, covenant `lockingBytecode` self-reproduction, mutable NFT state transitions, sender clawbacks, and adversarial drain rejection.
- **Interactive Chipnet Simulator:** Open `docs/index.html` locally or visit `https://khanhtnq.github.io/bch-blaze-cashstream/`.

---

## License

Released under the [MIT License](LICENSE).
