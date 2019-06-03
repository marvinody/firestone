import { Injectable, EventEmitter } from '@angular/core';
import { Queue } from 'queue-typescript';
import { GameEvents } from '../game-events.service';
import { GameEvent } from '../../models/game-event';
import { GameState } from '../../models/decktracker/game-state';
import { DeckParserService } from './deck-parser.service';
import { AllCardsService } from '../all-cards.service';
import { EventParser } from './event-parser/event-parser';
import { GameStartParser } from './event-parser/game-start-parser';
import { CardDrawParser } from './event-parser/card-draw-parser';
import { MulliganOverParser } from './event-parser/mulligan-over-parser';
import { CardBackToDeckParser } from './event-parser/card-back-to-deck-parser';
import { GameEndParser } from './event-parser/game-end-parser';
import { CardPlayedFromHandParser } from './event-parser/card-played-from-hand-parser';
import { SecretPlayedFromHandParser } from './event-parser/secret-played-from-hand-parser';
import { ReceiveCardInHandParser } from './event-parser/receive-card-in-hand-parser';
import { CardRemovedFromDeckParser } from './event-parser/card-removed-from-deck-parser';
import { CreateCardInDeckParser } from './event-parser/create-card-in-deck-parser';
import { EndOfEchoInHandParser } from './event-parser/end-of-echo-in-hand-parser';
import { MatchMetadataParser } from './event-parser/match-metadata-parser';
import { DiscardedCardParser } from './event-parser/discarded-card-parser';
import { CardRemovedFromHandParser } from './event-parser/card-removed-from-hand-parser';
import { CardRecruitedParser } from './event-parser/card-recruited-parser';
import { DynamicZoneHelperService } from './dynamic-zone-helper.service';
import { MinionSummonedParser } from './event-parser/minion-summoned-parser';
import { BurnedCardParser } from './event-parser/burned-card-parser';
import { SecretPlayedFromDeckParser } from './event-parser/secret-played-from-deck-parser';
import { PreferencesService } from '../preferences.service';
import { TwitchAuthService } from '../mainwindow/twitch-auth.service';

declare var overwolf: any;

@Injectable()
export class GameStateService {

	public state: GameState = new GameState();
	private eventParsers: ReadonlyArray<EventParser>;
	// We need to get through a queue to avoid race conditions when two events are close together, 
	// so that we're sure teh state is update sequentially
	private eventQueue: Queue<GameEvent> = new Queue<GameEvent>();
    private deckEventBus = new EventEmitter<any>();
    private eventEmitters = [];

	constructor(
            private gameEvents: GameEvents, 
            private dynamicZoneHelper: DynamicZoneHelperService,
            private allCards: AllCardsService,
            private prefs: PreferencesService,
            private twitch: TwitchAuthService,
			private deckParser: DeckParserService) {
		this.registerGameEvents();
        this.eventParsers = this.buildEventParsers();
        this.buildEventEmitters();
        const preferencesEventBus: EventEmitter<any> = overwolf.windows.getMainWindow().preferencesEventBus;
		preferencesEventBus.subscribe(async (event) => {
            console.log('received pref', event);
			if (event.name === PreferencesService.TWITCH_CONNECTION_STATUS) {
                console.log('rebuilding event emitters');
                this.buildEventEmitters();
			}
        });
		window['deckEventBus'] = this.deckEventBus;
		window['deckDebug'] = this;
		this.loadDecktrackerWindow();
	}

	private registerGameEvents() {
		this.gameEvents.allEvents.subscribe((gameEvent: GameEvent) => {
			this.eventQueue.enqueue(gameEvent);
		});
		setInterval(() => {
			if (!this.deckParser.currentDeck) {
				return;
			}
			let gameEvent: GameEvent;
			while (gameEvent = this.eventQueue.dequeue()) {
				this.processEvent(gameEvent);
			}
		}, 100);
    }
    
    private async buildEventEmitters() {
        const result = [(event) => this.deckEventBus.next(event)];
        const prefs = await this.prefs.getPreferences();
        console.log('is logged in to Twitch?', prefs);
        if (prefs.twitchAccessToken) {
            result.push((event) => this.twitch.emitDeckEvent(event));
        }
        this.eventEmitters = result;
        // console.log('emitting twitch event');
        // this.twitch.emitDeckEvent({ hop: "fakeEven" });
    }

	private processEvent(gameEvent: GameEvent) {
        if (!this.state) {
            console.error('null state before processing event', gameEvent, this.state);
            return;
        }
		for (let parser of this.eventParsers) {
			if (parser.applies(gameEvent)) {
                const newState = parser.parse(this.state, gameEvent);
                const playerDeckWithDynamicZones = this.dynamicZoneHelper.fillDynamicZones(newState.playerDeck);
                this.state = Object.assign(new GameState(), newState, {
                    playerDeck: playerDeckWithDynamicZones
                } as GameState);
                if (!this.state || !newState) {
                    console.error('null state after processing event', gameEvent, this.state);
                    return;
                }
				const emittedEvent = { 
					event: {
						name: parser.event()
					},
					state: this.state, 
                };
                this.eventEmitters.forEach((emitter) => emitter(emittedEvent));
				console.log('emitted deck event', emittedEvent.event.name);
			}
		}
	}

	private buildEventParsers(): ReadonlyArray<EventParser> {
		return [
			new GameStartParser(this.deckParser, this.allCards),
			new MatchMetadataParser(this.deckParser, this.allCards),
			new MulliganOverParser(this.deckParser, this.allCards),
			new CardDrawParser(this.deckParser, this.allCards),
			new ReceiveCardInHandParser(this.deckParser, this.allCards),
			new CardBackToDeckParser(this.deckParser, this.allCards),
			new CreateCardInDeckParser(this.deckParser, this.allCards),
			new CardRemovedFromDeckParser(this.deckParser, this.allCards),
			new CardRemovedFromHandParser(),
			new CardPlayedFromHandParser(this.deckParser, this.allCards),
			new SecretPlayedFromHandParser(this.deckParser, this.allCards),
			new EndOfEchoInHandParser(this.deckParser, this.allCards),
			new GameEndParser(this.deckParser, this.allCards),
			new DiscardedCardParser(),
			new CardRecruitedParser(),
			new MinionSummonedParser(this.allCards),
			new BurnedCardParser(),
			new SecretPlayedFromDeckParser(),
		];
	}

	private loadDecktrackerWindow() {
		overwolf.windows.obtainDeclaredWindow("DeckTrackerWindow", (result) => {
			if (result.status !== 'success') {
				console.warn('Could not get DeckTrackerWindow', result);
			}
			// console.log('got notifications window', result);
			let windowId = result.window.id;

			overwolf.windows.restore(windowId, (result) => {
				console.log('DeckTrackerWindow is on?', result);
				overwolf.windows.hide(windowId, (result) => {
					console.log('DeckTrackerWindow hidden', result);
				})
			})
		});
	}
}
