import { Component, NgZone, Input, SimpleChanges } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

import * as Raven from 'raven-js';

import { AllCardsService } from '../../services/all-cards.service';

import { Card } from '../../models/card';
import { Set, SetCard, MissingCard } from '../../models/set';

declare var overwolf: any;

@Component({
	selector: 'set-view',
	styleUrls: [`../../../css/component/collection/set.component.scss`],
	template: `
		<div *ngIf="cardSet" class="set" >
			<img src="{{'/Files/assets/images/set-logos/' + cardSet.id + '.png'}}" class="set-logo" />
			<span class="text set-name">{{cardSet.name}}</span>
			<span class="text">{{cardSet.ownedCards}} / {{cardSet.numberOfCards()}}</span>
		</div>
	`,
})
// 7.1.1.17994
export class SetComponent {

	@Input() private maxCards: number;
	@Input() private cardSet: Set;
	// private _showRarities = false;
	// private showMissingCards = false;

	constructor(
		private sanitizer: DomSanitizer,
		private cards: AllCardsService) {
		// console.log('constructor CollectionComponent');
	}

	// private toggleShowRarities() {
	// 	this._showRarities = !this._showRarities;
	// 	this.showMissingCards = !this.showMissingCards;
	// }

	// private collectedWidth() {
	// 	return this.maxCards == 0 ? 0 : Math.max(33, 100.0 * this.cardSet.numberOfCards() / this.maxCards);
	// }

	// private background() {
	// 	return this.sanitizer.bypassSecurityTrustStyle('url(/Files/assets/images/set-background/' + this.cardSet.id + '.jpg)')
	// }

	// private clip() {
	// 	return this.sanitizer.bypassSecurityTrustStyle('inset(0 ' + (100 - 100.0 * this.cardSet.ownedCards / this.cardSet.numberOfCards()) + '% 0 0)')
	// }

}
