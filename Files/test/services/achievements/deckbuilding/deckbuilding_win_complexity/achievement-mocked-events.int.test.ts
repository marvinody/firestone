import { Events } from '../../../../../src/js/services/events.service';
import { achievementsValidation } from '../../achievement-event-validation';
// These are created by copy-paste of the csharp plugin output after
// processing the power.log file
// Ideally, we will not have to go through this manual generation step
// and be able to plug the C# plugin directly
import pluginEvents from './plugin-events.json';
import rawAchievement from './raw_achievement.json';

describe('Deckbuilding - Complexity', () => {
	test('is completed when full events created by CSharp plugin and GEP are emitted', async () => {
		// Injecting the GEP events
		const additionalEvents = [
			{
				key: Events.PLAYER_INFO,
				value: { standardRank: 10 },
			},
		];
		const deckstring = 'AAECAf0EBu4CyQOmhwOWmgOKngPYoAMMwwGxCKP9AoOWA6aYA5+bA6CbA+KbA4ukA76kA9alA/SrAwA=';
		const isAchievementComplete = await achievementsValidation([rawAchievement], pluginEvents, additionalEvents, {
			deckstring: deckstring,
		});
		expect(isAchievementComplete).toBe(true);
	});

	test('is not completed when GEP event is missing', async () => {
		const isAchievementComplete = await achievementsValidation([rawAchievement], pluginEvents);
		expect(isAchievementComplete).toBeFalsy();
	});

	test('is not completed when deckstring is empty', async () => {
		// Injecting the GEP events
		const additionalEvents = [
			{
				key: Events.PLAYER_INFO,
				value: { standardRank: 10 },
			},
		];
		const deckstring = undefined;
		const isAchievementComplete = await achievementsValidation([rawAchievement], pluginEvents, additionalEvents, {
			deckstring: deckstring,
		});
		expect(isAchievementComplete).toBeFalsy();
	});
});
