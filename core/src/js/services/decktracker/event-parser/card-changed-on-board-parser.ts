import { ReferenceCard } from '@firestone-hs/reference-data';
import { AllCardsService } from '@firestone-hs/replay-parser';
import { DeckCard } from '../../../models/decktracker/deck-card';
import { DeckState } from '../../../models/decktracker/deck-state';
import { GameState } from '../../../models/decktracker/game-state';
import { GameEvent } from '../../../models/game-event';
import { DeckManipulationHelper } from './deck-manipulation-helper';
import { EventParser } from './event-parser';

export class CardChangedOnBoardParser implements EventParser {
	constructor(private readonly helper: DeckManipulationHelper, private readonly allCards: AllCardsService) {}

	applies(gameEvent: GameEvent, state: GameState): boolean {
		return state && gameEvent.type === GameEvent.CARD_CHANGED_ON_BOARD;
	}

	async parse(currentState: GameState, gameEvent: GameEvent): Promise<GameState> {
		const [cardId, controllerId, localPlayer, entityId] = gameEvent.parse();
		const creatorCardId = gameEvent.additionalData ? gameEvent.additionalData.creatorCardId : null;

		const isPlayer = controllerId === localPlayer.PlayerId;
		const deck = isPlayer ? currentState.playerDeck : currentState.opponentDeck;
		// We don't pass the cardId because we know it has changed
		const card = this.helper.findCardInZone(deck.board, null, entityId);
		if (!card) {
			console.warn('[card-changed-on-board] could not find card change on board', entityId, deck.board);
			return currentState;
		}
		const boardWithRemovedCard: readonly DeckCard[] = this.helper.removeSingleCardFromZone(
			deck.board,
			null,
			entityId,
		)[0];
		//console.log('boardWithRemovedCard', boardWithRemovedCard);

		// The CARD_CHANGED* events keep the same entityId, but change the cardId, and thus the card name
		const dbCard = this.allCards.getCard(cardId) || ({} as ReferenceCard);
		// So that we can keep track of transformed cards
		const oldCard = card.update({
			zone: 'TRANSFORMED_INTO_OTHER',
		} as DeckCard);
		//console.log('oldCard', oldCard);
		const updatedCard = card.update({
			cardId: cardId,
			cardName: dbCard.name,
			manaCost: dbCard.cost,
			rarity: dbCard.rarity ? dbCard.rarity.toLowerCase() : null,
			creatorCardId: creatorCardId,
		} as DeckCard);
		//console.log('updatedCard', updatedCard);
		const newBoard: readonly DeckCard[] = this.helper.addSingleCardToZone(boardWithRemovedCard, updatedCard);
		//console.log('newBoard', newBoard);
		const newOther: readonly DeckCard[] = this.helper.addSingleCardToZone(deck.otherZone, oldCard);
		//console.log('newOther', newOther);
		const newPlayerDeck = Object.assign(new DeckState(), deck, {
			board: newBoard,
			otherZone: newOther,
		});
		//console.log('newPlayerDeck', newPlayerDeck);
		return Object.assign(new GameState(), currentState, {
			[isPlayer ? 'playerDeck' : 'opponentDeck']: newPlayerDeck,
		});
	}

	event(): string {
		return GameEvent.CARD_CHANGED_ON_BOARD;
	}
}
