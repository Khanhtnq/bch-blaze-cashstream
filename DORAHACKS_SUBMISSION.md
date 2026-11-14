# CashStream Protocol — BCH Blaze 2026 Submission

## Executive Summary
- **Hackathon Track**: DoraHacks BCH BLAZE 2026 ($8,000 USD Prize Pool)
- **Protocol**: Autonomous Bitcoin Cash CashTokens Linear Streaming Covenant & Milestone Escrow
- **Technology Stack**: CashScript v0.14.0, CashTokens Native Introspection, Vitest, TypeScript

## Architecture & Smart Contracts
1. **CashStreamVault (`contracts/CashStreamVault.cash`)**:
   - Compiles to native Bitcoin Cash script (Opcode count: 212, Bytecode: 338 bytes).
   - Introspection covenant enforces `tx.inputs[this.activeInputIndex].tokenCategory == streamCategoryId`.
   - Linear continuous block-by-block vesting calculation with `tx.time >= claimTime` timelock guards.
   - Self-reproducing UTXO pattern: enforces `tx.outputs[0].lockingBytecode == tx.inputs[this.activeInputIndex].lockingBytecode` while sending claimed satoshis to the recipient's P2PKH script.
   - Sender clawback mechanism guarantees unvested balance recovery while respecting already-vested recipient claims.

2. **MilestoneEscrow (`contracts/MilestoneEscrow.cash`)**:
   - Compiles to native Bitcoin Cash script (Opcode count: 148, Bytecode: 240 bytes).
   - Multi-phase milestone grant release for bounties and autonomous agent contracts.
   - Arbiter dispute resolution and automated timeout refund mechanisms.

## Verification & Test Suite
- 11 unit & adversarial covenant tests passing 100% under `npm test` (`vitest`).
- Verifies deterministic vesting calculations, linear boundary conditions, covenant self-replication, and protection against unauthorized drain attempts.

## Chipnet Demo & Video
- Interactive simulator: `docs/index.html`
- High-definition video demo: `assets/demo_bch_1080p.mp4` (1920x1080, 30fps)
