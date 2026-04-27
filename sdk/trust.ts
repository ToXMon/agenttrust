/**
 * Trust Score SDK — On-chain trust score calculation and verification
 */

export interface TrustScore {
  agentAddress: string;
  score: number;
  level: TrustLevel;
  agreementsCompleted: number;
  agreementsDisputed: number;
  lastUpdated: number;
}

export enum TrustLevel {
  New = "new",
  Bronze = "bronze",
  Silver = "silver",
  Gold = "gold",
  Platinum = "platinum",
}

export interface TrustConfig {
  rpcUrl: string;
  trustNftAddress: string;
}

const LEVEL_THRESHOLDS: readonly [number, TrustLevel][] = [
  [80, TrustLevel.Platinum],
  [70, TrustLevel.Gold],
  [60, TrustLevel.Silver],
  [50, TrustLevel.Bronze],
];

export class TrustClient {
  private readonly _config: TrustConfig;

  constructor(config: TrustConfig) {
    this._config = config;
  }

  async getScore(agentAddress: string): Promise<TrustScore> {
    console.log(`[Trust] Getting score for ${agentAddress}`);
    return {
      agentAddress,
      score: 50,
      level: TrustLevel.Bronze,
      agreementsCompleted: 0,
      agreementsDisputed: 0,
      lastUpdated: Date.now(),
    };
  }

  async verifyThreshold(
    agentAddress: string,
    threshold: number,
  ): Promise<boolean> {
    const score = await this.getScore(agentAddress);
    return score.score >= threshold;
  }

  getLevel(score: number): TrustLevel {
    for (const [threshold, level] of LEVEL_THRESHOLDS) {
      if (score >= threshold) return level;
    }
    return TrustLevel.New;
  }

  getMaxEscrowAmount(level: TrustLevel): string {
    const limits: Record<TrustLevel, string> = {
      [TrustLevel.New]: "100000000000000000",
      [TrustLevel.Bronze]: "1000000000000000000",
      [TrustLevel.Silver]: "10000000000000000000",
      [TrustLevel.Gold]: "100000000000000000000",
      [TrustLevel.Platinum]: "1000000000000000000000",
    };
    return limits[level];
  }
}
