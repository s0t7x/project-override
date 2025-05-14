export interface ICharacterStats {
	health: number;
	mana: number;
	strength: number;
	agility: number;
	intelligence: number;
	stamina: number;
	luck: number;
	attackPower: {
		physical: number;
		magical?: number;
		fire?: number;
		ice?: number;
		lightning?: number;
		poison?: number;
		holy?: number;
		dark?: number;
	};
	defensePower: {
		physical: number;
		magical: number;
		fire?: number;
		ice?: number;
		lightning?: number;
		poison?: number;
		holy?: number;
		dark?: number;
	};
	movementSpeed: number;
	attackSpeed: number;
	castingSpeed: number;
	criticalHitChance: number;
	criticalHitDamage: number;
	dodgeChance: number;
	blockChance: number;
}
