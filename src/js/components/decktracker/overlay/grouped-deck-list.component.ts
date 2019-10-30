import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, ViewRef } from '@angular/core';
import { DeckCard } from '../../../models/decktracker/deck-card';
import { DeckState } from '../../../models/decktracker/deck-state';
import { DeckZone } from '../../../models/decktracker/view/deck-zone';
import { VisualDeckCard } from '../../../models/decktracker/visual-deck-card';

@Component({
	selector: 'grouped-deck-list',
	styleUrls: [
		'../../../../css/global/components-global.scss',
		'../../../../css/component/decktracker/overlay/grouped-deck-list.component.scss',
	],
	template: `
		<ul class="deck-list">
			<deck-zone *ngIf="zone" [zone]="zone" [activeTooltip]="activeTooltip"></deck-zone>
		</ul>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupedDeckListComponent {
	@Input() activeTooltip: string;
	zone: DeckZone;

	private deckList: readonly DeckCard[];
	private deck: readonly DeckCard[];
	private hand: readonly DeckCard[];
	private _highlight: boolean;

	@Input('deckState') set deckState(deckState: DeckState) {
		// When we don't have the decklist, we just show all the cards in hand + deck
		this.hand = deckState.hand;
		this.deckList = deckState.deckList || [];
		this.deck =
			this.deckList.length > 0
				? deckState.deck
				: [...deckState.deck, ...deckState.hand, ...deckState.otherZone].sort(
						(a, b) => a.manaCost - b.manaCost,
				  );
		// console.log('setting deck state', deckState, this.deck);
		this.buildGroupedList();
	}

	@Input() set highlightCardsInHand(value: boolean) {
		this._highlight = value;
		// console.log('setting highlightCardsInHand', value);
		this.buildGroupedList();
	}

	constructor(private readonly cdr: ChangeDetectorRef) {}

	private async buildGroupedList() {
		// console.log('grouping deck list?', deckState.deckList, deck, deckState);
		// The zone in this view is the decklist + cards in the deck that didn't
		// start in the decklist
		const groupedFromDecklist: Map<string, DeckCard[]> = this.groupBy(
			this.deckList,
			(card: DeckCard) => card.cardId,
		);
		const groupedFromDeck: Map<string, DeckCard[]> = this.groupBy(this.deck, (card: DeckCard) => card.cardId);
		const groupedFromNotInBaseDeck: Map<string, DeckCard[]> = this.groupBy(
			this.deck.filter(card => !this.deckList.find(c => c.cardId === card.cardId)),
			(card: DeckCard) => card.cardId,
		);
		const base = [];
		for (const cardId of Array.from(groupedFromDecklist.keys())) {
			const cardsInDeck = (groupedFromDeck.get(cardId) || []).length;
			const isAtLeastOneCardInHand = (this.hand || []).filter(card => card.cardId === cardId).length > 0;
			// console.log(
			// 	'at least one card in hand 1?',
			// 	cardId,
			// 	isAtLeastOneCardInHand,
			// 	cardsInDeck,
			// 	groupedFromDeck.get(cardId) || [],
			// );
			for (let i = 0; i < cardsInDeck; i++) {
				base.push({
					cardId: groupedFromDecklist.get(cardId)[0].cardId,
					cardName: groupedFromDecklist.get(cardId)[0].cardName,
					manaCost: groupedFromDecklist.get(cardId)[0].manaCost,
					rarity: groupedFromDecklist.get(cardId)[0].rarity,
					highlight: isAtLeastOneCardInHand && this._highlight ? 'in-hand' : 'normal',
				} as VisualDeckCard);
			}
			if (cardsInDeck === 0) {
				base.push({
					cardId: groupedFromDecklist.get(cardId)[0].cardId,
					cardName: groupedFromDecklist.get(cardId)[0].cardName,
					manaCost: groupedFromDecklist.get(cardId)[0].manaCost,
					rarity: groupedFromDecklist.get(cardId)[0].rarity,
					highlight: isAtLeastOneCardInHand && this._highlight ? 'in-hand' : 'dim',
				} as VisualDeckCard);
			}
		}
		for (const cardId of Array.from(groupedFromNotInBaseDeck.keys())) {
			const cardsInDeck = (groupedFromDeck.get(cardId) || []).length;
			const isAtLeastOneCardInHand = (this.hand || []).filter(card => card.cardId === cardId).length > 0;
			// console.log(
			// 	'at least one card in hand?',
			// 	cardId,
			// 	isAtLeastOneCardInHand,
			// 	cardsInDeck,
			// 	groupedFromDeck.get(cardId) || [],
			// );
			for (let i = 0; i < cardsInDeck; i++) {
				base.push({
					cardId: groupedFromDeck.get(cardId)[i].cardId,
					cardName: groupedFromDeck.get(cardId)[i].cardName,
					manaCost: groupedFromDeck.get(cardId)[i].manaCost,
					rarity: groupedFromDeck.get(cardId)[i].rarity,
					highlight: isAtLeastOneCardInHand && this._highlight ? 'in-hand' : 'normal',
				} as VisualDeckCard);
			}
		}
		this.zone = {
			id: 'single-zone',
			name: undefined,
			cards: base,
			sortingFunction: (a, b) => a.manaCost - b.manaCost,
		} as DeckZone;
		if (!(this.cdr as ViewRef).destroyed) {
			this.cdr.detectChanges();
		}
	}

	private groupBy(list, keyGetter): Map<string, DeckCard[]> {
		const map = new Map();
		list.forEach(item => {
			const key = keyGetter(item);
			const collection = map.get(key);
			if (!collection) {
				map.set(key, [item]);
			} else {
				collection.push(item);
			}
		});
		return map;
	}
}
