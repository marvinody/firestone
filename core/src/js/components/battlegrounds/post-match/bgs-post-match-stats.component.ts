import {
	AfterViewInit,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	ElementRef,
	EventEmitter,
	Input,
	ViewRef,
} from '@angular/core';
import { Entity } from '@firestone-hs/replay-parser';
import { BgsPostMatchStatsPanel } from '../../../models/battlegrounds/post-match/bgs-post-match-stats-panel';
import { BgsStatsFilterId } from '../../../models/battlegrounds/post-match/bgs-stats-filter-id.type';
import { MinionStat } from '../../../models/battlegrounds/post-match/minion-stat';
import { BgsPostMatchStatsFilterChangeEvent } from '../../../services/battlegrounds/store/events/bgs-post-match-stats-filter-change-event';
import { BattlegroundsStoreEvent } from '../../../services/battlegrounds/store/events/_battlegrounds-store-event';
import { OverwolfService } from '../../../services/overwolf.service';

declare let amplitude: any;

@Component({
	selector: 'bgs-post-match-stats',
	styleUrls: [
		`../../../../css/global/components-global.scss`,
		`../../../../css/component/battlegrounds/in-game/bgs-opponent-overview-big.component.scss`,
		`../../../../css/component/battlegrounds/post-match/bgs-post-match-stats.component.scss`,
	],
	template: `
		<div class="container">
			<div class="content">
				<div class="opponent-overview">
					<div class="background-additions">
						<div class="top"></div>
						<div class="bottom"></div>
					</div>
					<div class="portrait">
						<bgs-hero-portrait
							class="icon"
							[icon]="icon"
							[health]="health"
							[maxHealth]="maxHealth"
							[cardTooltip]="heroPowerCardId"
							[cardTooltipText]="name"
							[cardTooltipClass]="'bgs-hero-power'"
						></bgs-hero-portrait>
						<tavern-level-icon [level]="tavernTier" class="tavern"></tavern-level-icon>
					</div>
					<div class="opponent-info">
						<div class="main-info">
							<bgs-board
								[entities]="boardMinions"
								[finalBoard]="true"
								[minionStats]="minionStats"
							></bgs-board>
						</div>
					</div>
				</div>
				<div class="stats">
					<ul class="tabs">
						<li
							*ngFor="let tab of tabs"
							class="tab"
							[ngClass]="{ 'active': tab === selectedTab }"
							(click)="selectTab(tab)"
						>
							{{ getLabel(tab) }}
						</li>
					</ul>
					<ng-container [ngSwitch]="selectedTab">
						<bgs-chart-hp *ngSwitchCase="'hp-by-turn'" class="stat" [stats]="_panel?.stats"> </bgs-chart-hp>
						<bgs-chart-warband-stats
							*ngSwitchCase="'warband-total-stats-by-turn'"
							class="stat"
							[stats]="_panel"
						>
						</bgs-chart-warband-stats>
						<bgs-chart-warband-composition
							*ngSwitchCase="'warband-composition-by-turn'"
							[stats]="_panel?.stats"
							class="stat"
						>
						</bgs-chart-warband-composition>
						<bgs-chart-stats *ngSwitchCase="'stats'" class="stat" [stats]="_panel?.stats">
						</bgs-chart-stats>
					</ng-container>
				</div>
				<!-- <filter
					[filterOptions]="filterOptions"
					[activeFilter]="activeFilter"
					[placeholder]="placeholder"
					[delegateFullControl]="true"
					[filterChangeFunction]="filterChangeFunction"
				></filter> -->
			</div>
			<div class="left"></div>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BgsPostMatchStatsComponent implements AfterViewInit {
	_panel: BgsPostMatchStatsPanel;

	icon: string;
	health: number;
	maxHealth: number;
	heroPowerCardId: string;
	name: string;
	tavernTier: number;
	boardMinions: readonly Entity[];
	minionStats: readonly MinionStat[];
	tabs: readonly BgsStatsFilterId[];
	selectedTab: BgsStatsFilterId;

	@Input() set panel(value: BgsPostMatchStatsPanel) {
		console.log('setting panel');
		this._panel = value;
		this.icon = `https://static.zerotoheroes.com/hearthstone/fullcard/en/256/battlegrounds/${value.player.cardId}.png`;
		this.health = value.player.initialHealth - value.player.damageTaken;
		this.maxHealth = value.player.initialHealth;
		this.heroPowerCardId = value.player.heroPowerCardId;
		this.name = value.player.name;
		this.tavernTier = value.player.getCurrentTavernTier();
		this.boardMinions = value.player.getLastKnownBoardState();
		this.tabs = value.tabs;
		this.selectedTab = value.selectedStat;
		if (!(this.cdr as ViewRef)?.destroyed) {
			this.cdr.detectChanges();
		}
	}

	// filterOptions: readonly IOption[] = [
	// 	{ label: 'HP by turn', value: 'hp-by-turn' },
	// 	{ label: 'Board total stats', value: 'warband-total-stats-by-turn' },
	// 	{ label: 'Warband composition', value: 'warband-composition-by-turn' },
	// 	{ label: 'Stats', value: 'stats' },
	// ];
	// activeFilter: BgsStatsFilterId;
	// placeholder = 'Select stats';
	// filterChangeFunction: (option: IOption) => void;

	private battlegroundsUpdater: EventEmitter<BattlegroundsStoreEvent>;

	constructor(
		private readonly el: ElementRef,
		private readonly cdr: ChangeDetectorRef,
		private readonly ow: OverwolfService,
	) {
		console.log('in construftor');
	}

	async ngAfterViewInit() {
		console.log('after view init');
		// this.onResize();
		this.battlegroundsUpdater = (await this.ow.getMainWindow()).battlegroundsUpdater;

		// this.filterChangeFunction = (option: IOption) =>
		// 	this.battlegroundsUpdater.next(new BgsPostMatchStatsFilterChangeEvent(option.value as BgsStatsFilterId));
		// console.log('filterChangeFunction', this.filterChangeFunction);
		if (!(this.cdr as ViewRef)?.destroyed) {
			this.cdr.detectChanges();
		}
	}

	selectTab(tab: BgsStatsFilterId) {
		this.battlegroundsUpdater.next(new BgsPostMatchStatsFilterChangeEvent(tab));
	}

	getLabel(tab: BgsStatsFilterId): string {
		switch (tab) {
			case 'hp-by-turn':
				return 'HP by turn';
			case 'stats':
				return 'Stats';
			case 'warband-composition-by-turn':
				return 'Compositions';
			case 'warband-total-stats-by-turn':
				return 'Warband stats';
		}
	}
}
