import { Component, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, EventEmitter, HostListener, ViewRef } from '@angular/core';

import { DebugService } from '../../../services/debug.service';
import { GameState } from '../../../models/decktracker/game-state';
import { DeckEvents } from '../../../services/decktracker/event-parser/deck-events';
import { Preferences } from '../../../models/preferences';
import { PreferencesService } from '../../../services/preferences.service';
import { GameType } from '../../../models/enums/game-type';
import { Events } from '../../../services/events.service';
import { ScenarioId } from '../../../models/scenario-id';
import { OverwolfService } from '../../../services/overwolf.service';

declare var overwolf: any;
declare var ga: any;

@Component({
	selector: 'decktracker-overlay',
	styleUrls: [
		'../../../../css/global/components-global.scss',
		'../../../../css/component/decktracker/overlay/decktracker-overlay.component.scss',
		'../../../../css/component/decktracker/overlay/decktracker-overlay-clean.scss',
	],
	template: `
        <div class="root" [ngClass]="{'clean': useCleanMode}">
            <div class="decktracker-container">
                <div class="decktracker" *ngIf="gameState">
                    <decktracker-title-bar [windowId]="windowId"></decktracker-title-bar>
                    <decktracker-deck-name 
                        [hero]="gameState.playerDeck.hero"
                        [deckName]="gameState.playerDeck.name">				
                    </decktracker-deck-name>
                    <decktracker-deck-list 
                            [deckState]="gameState.playerDeck"
                            [displayMode]="displayMode"
                            (onDisplayModeChanged)="onDisplayModeChanged($event)"
                            [activeTooltip]="activeTooltip">
                    </decktracker-deck-list>
                </div>
            </div>

			<i class="i-54 gold-theme corner top-left">
				<svg class="svg-icon-fill">
					<use xlink:href="assets/svg/sprite.svg#golden_corner"/>
				</svg>
			</i>
			<i class="i-54 gold-theme corner top-right">
				<svg class="svg-icon-fill">
					<use xlink:href="assets/svg/sprite.svg#golden_corner"/>
				</svg>
			</i>
			<i class="i-54 gold-theme corner bottom-right">
				<svg class="svg-icon-fill">
					<use xlink:href="assets/svg/sprite.svg#golden_corner"/>
				</svg>
			</i>
			<i class="i-54 gold-theme corner bottom-left">
				<svg class="svg-icon-fill">
					<use xlink:href="assets/svg/sprite.svg#golden_corner"/>
				</svg>
			</i>
			<tooltips [module]="'decktracker'"></tooltips>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeckTrackerOverlayComponent implements AfterViewInit {

	// This should not be necessary, but is an additional guard
	private readonly SCENARIO_IDS_WITH_UNAVAILABLE_LISTS: number[] = 
		[ScenarioId.DUNGEON_RUN, ScenarioId.MONSTER_HUNT, ScenarioId.RUMBLE_RUN];

	gameState: GameState;
	windowId: string;
    activeTooltip: string;
    overlayDisplayed: boolean;
    displayMode: string;
    useCleanMode: boolean;

	private showTooltipTimer;
	private hideTooltipTimer;

	constructor(
			private prefs: PreferencesService,
			private cdr: ChangeDetectorRef,
            private events: Events,
            private ow: OverwolfService,
			private debugService: DebugService) {
		overwolf.windows.getCurrentWindow((result) => {
			this.windowId = result.window.id;
		});
		overwolf.games.onGameInfoUpdated.addListener((res: any) => {
			if (this.exitGame(res)) {
				this.closeApp();
			}
		});
		this.events.on(Events.DECK_SHOW_TOOLTIP).subscribe((data) => {
			// this.activeTooltip = data.data[0];
			// this.events.broadcast(Events.SHOW_TOOLTIP, ...data.data);
            // this.cdr.detectChanges();
			clearTimeout(this.hideTooltipTimer);
			// Already in tooltip mode
			if (this.activeTooltip) {
				this.activeTooltip = data.data[0];
				this.events.broadcast(Events.SHOW_TOOLTIP, ...data.data);
                if (!(<ViewRef>this.cdr).destroyed) {
                    this.cdr.detectChanges();
                }
			}
			else {
				this.showTooltipTimer = setTimeout(() => {
					this.activeTooltip = data.data[0];
					this.events.broadcast(Events.SHOW_TOOLTIP, ...data.data);
                    if (!(<ViewRef>this.cdr).destroyed) {
                        this.cdr.detectChanges();
                    }
				}, 500)
			}
		});
		this.events.on(Events.DECK_HIDE_TOOLTIP).subscribe((data) => {
			// this.activeTooltip = undefined;
			// this.events.broadcast(Events.HIDE_TOOLTIP, ...data.data);
            // this.cdr.detectChanges();
            // console.log('received hide tooltip event', data);
            clearTimeout(this.showTooltipTimer);
			this.hideTooltipTimer = setTimeout(() => {
                // console.log('hidigin tooltip');
				this.activeTooltip = undefined;
				this.events.broadcast(Events.HIDE_TOOLTIP);
                if (!(<ViewRef>this.cdr).destroyed) {
                    this.cdr.detectChanges();
                }
			}, data.data[0] ? data.data[0] : 200);
		});
		const deckEventBus: EventEmitter<any> = overwolf.windows.getMainWindow().deckEventBus;
	 	deckEventBus.subscribe(async (event) => {
			console.log('received deck event', event.event);
			this.gameState = event.state;
			await this.processEvent(event.event);
			if (!(<ViewRef>this.cdr).destroyed) {
				this.cdr.detectChanges();
			}
		});
		const preferencesEventBus: EventEmitter<any> = overwolf.windows.getMainWindow().preferencesEventBus;
		preferencesEventBus.subscribe((event) => {
			console.log('received pref event', event);
			if (event.name === PreferencesService.DECKTRACKER_OVERLAY_DISPLAY) {
				this.handleDisplayPreferences(event.preferences);
			}
		});
	}

	ngAfterViewInit() {
		// We get the changes via event updates, so automated changed detection isn't useful in PUSH mode
		this.cdr.detach();
        this.handleDisplayPreferences();
        if (process.env.NODE_ENV !== 'production') {
            console.error("Should not allow debug game state from production");
            this.gameState = overwolf.windows.getMainWindow().deckDebug.state;
            console.log('game state', this.gameState, JSON.stringify(this.gameState));
        }
		if (!(<ViewRef>this.cdr).destroyed) {
			this.cdr.detectChanges();
		}
		console.log('handled after view init');
	}

	@HostListener('mousedown')
	dragMove() {
		overwolf.windows.dragMove(this.windowId);
	}

	onDisplayModeChanged(pref: string) {
		this.prefs.setOverlayDisplayMode(pref);
    }
    
	private async processEvent(event) {
		switch(event.name) {
			case DeckEvents.MATCH_METADATA:
				console.log('received MATCH_METADATA event');
				this.handleDisplayPreferences();
				break;
			case DeckEvents.GAME_END:
				console.log('received GAME_END event');
				this.hideWindow();
				break;
		}
	}

	private async handleDisplayPreferences(preferences: Preferences = null) {
        console.log('retrieving preferences');
        preferences = preferences || await this.prefs.getPreferences();
        this.useCleanMode = preferences.decktrackerSkin === 'clean';
        this.displayMode = this.useCleanMode
                ? 'DISPLAY_MODE_GROUPED'
                : (preferences.overlayDisplayMode || 'DISPLAY_MODE_ZONE');
        console.log('switching views?', this.useCleanMode, this.displayMode);

		const shouldDisplay = await this.shouldDisplayOverlay(preferences);
		console.log('should display overlay?', shouldDisplay, preferences);
		if (!this.overlayDisplayed && shouldDisplay) {
			ga('send', 'event', 'decktracker', 'show');
			this.restoreWindow();
		}
		else if (this.overlayDisplayed && !shouldDisplay) {
			this.hideWindow();
        }
		if (!(<ViewRef>this.cdr).destroyed) {
			this.cdr.detectChanges();
		}
	}

	private async shouldDisplayOverlay(preferences: Preferences = null): Promise<boolean> {
		const prefs = preferences || await this.prefs.getPreferences();
		console.log('merged prefs', prefs, this.gameState);
		if (!this.gameState 
				|| !this.gameState.metadata 
				|| !this.gameState.metadata.gameType
				|| !this.gameState.playerDeck
				|| !this.gameState.playerDeck.deckList) { 
			return false;
		}
		switch (this.gameState.metadata.gameType as GameType) {
			case GameType.ARENA: 
				return this.gameState.playerDeck.deckList.length > 0 && prefs.decktrackerShowArena;
			case GameType.CASUAL: 
				return this.gameState.playerDeck.deckList.length > 0 && prefs.decktrackerShowCasual;
			case GameType.RANKED: 
				return this.gameState.playerDeck.deckList.length > 0 && prefs.decktrackerShowRanked;
			case GameType.VS_AI:
				return this.gameState.playerDeck.deckList.length > 0 
						&& prefs.decktrackerShowPractice
						&& this.SCENARIO_IDS_WITH_UNAVAILABLE_LISTS.indexOf(this.gameState.metadata.scenarioId) === -1;
			case GameType.VS_FRIEND: 
				return this.gameState.playerDeck.deckList.length > 0 && prefs.decktrackerShowFriendly;
			case GameType.FSG_BRAWL: 
			case GameType.FSG_BRAWL_1P_VS_AI: 
			case GameType.FSG_BRAWL_2P_COOP: 
			case GameType.FSG_BRAWL_VS_FRIEND: 
			case GameType.TB_1P_VS_AI: 
			case GameType.TB_2P_COOP: 
			case GameType.TAVERNBRAWL: 
				return this.gameState.playerDeck.deckList.length > 0 && prefs.decktrackerShowTavernBrawl;
		}
		return this.gameState.playerDeck.deckList.length > 0;
	}

	private restoreWindow() {
		overwolf.windows.restore(this.windowId, (result) => {
			// console.log('window restored', result);
			let width = 252;
			overwolf.games.getRunningGameInfo((gameInfo) => {
				// console.log('got running game info', gameInfo);
				if (!gameInfo) {
					return;
				}
				let gameWidth = gameInfo.logicalWidth;
				let gameHeight = gameInfo.logicalHeight;
				let dpi = gameWidth / gameInfo.width;
				// console.log('computed stuff', gameWidth, gameHeight, dpi);
				overwolf.windows.changeSize(this.windowId, width, gameHeight, (changeSize) => {
					// https://stackoverflow.com/questions/8388440/converting-a-double-to-an-int-in-javascript-without-rounding
					let newLeft = ~~(gameWidth - width* dpi - 20); // Leave a bit of room to the right
					let newTop = 0;
					// console.log('changing position', newLeft, newTop, width, gameHeight, changeSize);
					overwolf.windows.changePosition(this.windowId, newLeft, newTop, (changePosition) => {
						// console.log('changed window position', changePosition);
					});
				});
			});
		});
	}

	private hideWindow() {
		overwolf.windows.hide(this.windowId, (result) => {
		})
	}

	private exitGame(gameInfoResult: any): boolean {
		return (!gameInfoResult || !gameInfoResult.gameInfo || !gameInfoResult.gameInfo.isRunning);
	}

	private closeApp() {
		overwolf.windows.getCurrentWindow((result) => {
			if (result.status === "success") {
				// console.log('closing');
				overwolf.windows.close(result.window.id);
			}
		});
	}
}