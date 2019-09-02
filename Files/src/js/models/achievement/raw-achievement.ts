import { RawRequirement } from './raw-requirement';

export interface RawAchievement {
	readonly id: string;
	readonly type: string;
	readonly name: string;
	readonly root?: boolean;
	readonly priority?: number;
	readonly displayName: string;
	readonly emptyText?: string;
	readonly text: string;
	readonly completedText?: string;
	readonly displayCardId: string;
	readonly displayCardType: string;
	readonly difficulty: string;
	readonly points: number;
	readonly requirements: readonly RawRequirement[];
	readonly resetEvents: readonly string[];
}
