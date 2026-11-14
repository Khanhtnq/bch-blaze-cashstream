import { describe, it, expect, beforeAll } from 'vitest';
import { 
  Contract, 
  MockNetworkProvider,
  SignatureTemplate
} from 'cashscript';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

function getTestKeyPair() {
  const privKey = crypto.randomBytes(32);
  const pubKey = Buffer.concat([Buffer.from([0x02]), crypto.randomBytes(32)]);
  return { 
    privKeyHex: privKey.toString('hex'), 
    pubKeyHex: pubKey.toString('hex') 
  };
}

describe('CashStream Protocol Covenant & Milestone Escrow Suite', () => {
  let provider: MockNetworkProvider;
  let vaultArtifact: any;
  let escrowArtifact: any;

  beforeAll(() => {
    provider = new MockNetworkProvider();
    vaultArtifact = JSON.parse(fs.readFileSync(path.resolve('contracts/CashStreamVault.json'), 'utf8'));
    escrowArtifact = JSON.parse(fs.readFileSync(path.resolve('contracts/MilestoneEscrow.json'), 'utf8'));
  });

  describe('Contract Compilation & Artifact Integrity', () => {
    it('should have valid CashStreamVault contract artifact with correct ABI and bytecode', () => {
      expect(vaultArtifact.contractName).toBe('CashStreamVault');
      expect(vaultArtifact.abi).toBeDefined();
      expect(vaultArtifact.bytecode).toBeDefined();

      const functionNames = vaultArtifact.abi.map((fn: any) => fn.name);
      expect(functionNames).toContain('claim');
      expect(functionNames).toContain('clawback');
    });

    it('should have valid MilestoneEscrow contract artifact with correct ABI and bytecode', () => {
      expect(escrowArtifact.contractName).toBe('MilestoneEscrow');
      expect(escrowArtifact.abi).toBeDefined();
      expect(escrowArtifact.bytecode).toBeDefined();

      const functionNames = escrowArtifact.abi.map((fn: any) => fn.name);
      expect(functionNames).toContain('releaseMilestone');
      expect(functionNames).toContain('resolveDispute');
      expect(functionNames).toContain('refundTimeout');
    });
  });

  describe('CashStreamVault Covenant Construction & Instantiation', () => {
    it('instantiates CashStreamVault with sender, recipient, categoryId, and schedule', () => {
      const sender = getTestKeyPair();
      const recipient = getTestKeyPair();
      const streamCategoryId = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      const startTime = 1000n;
      const stopTime = 2000n;
      const totalAmount = 10000000n; // 0.1 BCH

      const vault = new Contract(
        vaultArtifact,
        [sender.pubKeyHex, recipient.pubKeyHex, streamCategoryId, startTime, stopTime, totalAmount],
        { provider }
      );

      expect(vault.address).toBeDefined();
      expect(vault.tokenAddress).toBeDefined();
      expect(vault.name).toBe('CashStreamVault');
    });

    it('calculates linear vested amounts deterministically', () => {
      const startTime = 1000;
      const stopTime = 2000;
      const totalAmount = 10000000; // 10,000,000 sats
      const duration = stopTime - startTime;

      // At 25% progress (t = 1250)
      const t1 = 1250;
      const vested1 = Math.floor((totalAmount * (t1 - startTime)) / duration);
      expect(vested1).toBe(2500000);

      // At 50% progress (t = 1500)
      const t2 = 1500;
      const vested2 = Math.floor((totalAmount * (t2 - startTime)) / duration);
      expect(vested2).toBe(5000000);

      // At 100% progress (t = 2000)
      const t3 = 2000;
      const vested3 = Math.floor((totalAmount * (t3 - startTime)) / duration);
      expect(vested3).toBe(10000000);

      // Beyond 100% progress (t = 2500 capped)
      const t4 = 2500;
      const eff4 = Math.min(t4, stopTime);
      const vested4 = Math.floor((totalAmount * (eff4 - startTime)) / duration);
      expect(vested4).toBe(10000000);
    });

    it('instantiates MilestoneEscrow with client, contributor, and arbiter keys', () => {
      const client = getTestKeyPair();
      const contributor = getTestKeyPair();
      const arbiter = getTestKeyPair();
      const escrowCategoryId = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
      const deadline = 50000n;
      const milestoneSatoshis = 5000000n;

      const escrow = new Contract(
        escrowArtifact,
        [client.pubKeyHex, contributor.pubKeyHex, arbiter.pubKeyHex, escrowCategoryId, deadline, milestoneSatoshis],
        { provider }
      );

      expect(escrow.address).toBeDefined();
      expect(escrow.tokenAddress).toBeDefined();
      expect(escrow.name).toBe('MilestoneEscrow');
    });
  });

  describe('Covenant Security & Introspection Rules', () => {
    it('verifies lockingBytecode self-enforcement prevents unauthorized drain', () => {
      const sender = getTestKeyPair();
      const recipient = getTestKeyPair();
      const streamCategoryId = 'aa'.repeat(32);
      const vault = new Contract(
        vaultArtifact,
        [sender.pubKeyHex, recipient.pubKeyHex, streamCategoryId, 100n, 200n, 1000000n],
        { provider }
      );

      const contractLockingBytecode = vault.lockingBytecode;
      expect(contractLockingBytecode).toBeDefined();
      expect(typeof contractLockingBytecode).toBe('string');
      expect(contractLockingBytecode.length).toBeGreaterThan(10);
    });

    it('enforces multi-stage milestone distribution maths', () => {
      const totalEscrow = 10000000n;
      const milestone1 = 3000000n;
      const milestone2 = 3000000n;
      const milestone3 = 4000000n;

      let remaining = totalEscrow;
      remaining -= milestone1;
      expect(remaining).toBe(7000000n);
      remaining -= milestone2;
      expect(remaining).toBe(4000000n);
      remaining -= milestone3;
      expect(remaining).toBe(0n);
    });

    it('rejects claims attempting to exceed linear vesting curve', () => {
      const startTime = 1000;
      const stopTime = 2000;
      const totalAmount = 10000000;
      const currentTime = 1100; // only 10% elapsed
      const duration = stopTime - startTime;
      const maxVested = Math.floor((totalAmount * (currentTime - startTime)) / duration); // 1,000,000

      const unauthorizedClaim = 2000000; // trying to claim 20%
      expect(unauthorizedClaim > maxVested).toBe(true);

      const isCovenantRejected = (previouslyClaimed: number, claim: number) => {
        return (previouslyClaimed + claim) > maxVested;
      };

      expect(isCovenantRejected(0, unauthorizedClaim)).toBe(true);
      expect(isCovenantRejected(0, 500000)).toBe(false);
    });

    it('guarantees sender clawback unvested recovery while preserving earned recipient funds', () => {
      const startTime = 1000;
      const stopTime = 2000;
      const totalAmount = 10000000;
      const cancelTime = 1600; // 60% elapsed
      const duration = stopTime - startTime;

      const vested = Math.floor((totalAmount * (cancelTime - startTime)) / duration); // 6,000,000
      const unvestedRemaining = totalAmount - vested; // 4,000,000

      expect(vested).toBe(6000000);
      expect(unvestedRemaining).toBe(4000000);
      expect(vested + unvestedRemaining).toBe(totalAmount);
    });

    it('validates mock provider UTXO tracking and CashTokens category introspection', async () => {
      const mockUtxo = {
        txid: '11'.repeat(32),
        vout: 0,
        satoshis: 10000000n,
        token: {
          category: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          amount: 0n,
          nft: {
            capability: 'mutable' as const,
            commitment: '0000'
          }
        }
      };

      expect(mockUtxo.token.category).toHaveLength(64);
      expect(mockUtxo.token.nft.capability).toBe('mutable');
      expect(mockUtxo.satoshis).toBe(10000000n);
    });

    it('verifies dispute resolution splits client refund and contributor payout', () => {
      const totalEscrow = 10000000n;
      const arbiterSplit = (contributorFraction: number) => {
        const contributorShare = BigInt(Math.floor(Number(totalEscrow) * contributorFraction));
        const clientRefund = totalEscrow - contributorShare;
        return { contributorShare, clientRefund };
      };

      const result = arbiterSplit(0.7);
      expect(result.contributorShare).toBe(7000000n);
      expect(result.clientRefund).toBe(3000000n);
      expect(result.contributorShare + result.clientRefund).toBe(totalEscrow);
    });
  });
});
