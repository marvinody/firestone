import {
	AfterContentInit,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	ElementRef,
	Renderer2,
} from '@angular/core';
import { AbstractWidgetWrapperComponent } from '@components/overlays/_widget-wrapper.component';
import { SceneMode } from '@firestone-hs/reference-data';
import { OverwolfService } from '@firestone/shared/framework/core';
import { Observable, combineLatest } from 'rxjs';
import { Preferences } from '../../models/preferences';
import { PreferencesService } from '../../services/preferences.service';
import { AppUiStoreFacadeService } from '../../services/ui-store/app-ui-store-facade.service';

@Component({
	selector: 'lottery-widget-wrapper',
	styleUrls: ['../../../css/component/overlays/decktracker-player-widget-wrapper.component.scss'],
	template: `
		<lottery
			class="widget"
			*ngIf="showWidget$ | async"
			cdkDrag
			(cdkDragStarted)="startDragging()"
			(cdkDragReleased)="stopDragging()"
			(cdkDragEnded)="dragEnded($event)"
		></lottery>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LotteryWidgetWrapperComponent extends AbstractWidgetWrapperComponent implements AfterContentInit {
	protected defaultPositionLeftProvider = (gameWidth: number, gameHeight: number) => 200;
	protected defaultPositionTopProvider = (gameWidth: number, gameHeight: number) => 400;
	protected positionUpdater = (left: number, top: number) => this.prefs.updateLotteryPosition(left, top);
	protected positionExtractor = async (prefs: Preferences) => prefs.lotteryPosition;
	protected getRect = () => this.el.nativeElement.querySelector('.widget')?.getBoundingClientRect();
	protected bounds = {
		left: 0,
		top: -20,
		right: 0,
		bottom: 0,
	};

	showWidget$: Observable<boolean>;

	constructor(
		protected readonly ow: OverwolfService,
		protected readonly el: ElementRef,
		protected readonly prefs: PreferencesService,
		protected readonly renderer: Renderer2,
		protected readonly store: AppUiStoreFacadeService,
		protected readonly cdr: ChangeDetectorRef,
	) {
		super(ow, el, prefs, renderer, store, cdr);
		this.forceKeepInBounds = true;
	}

	ngAfterContentInit(): void {
		this.showWidget$ = combineLatest([
			this.store.listen$(([main, nav, prefs]) => main.currentScene),
			this.store.listenPrefs$(
				(prefs) => prefs.showLottery,
				(prefs) => prefs.lotteryOverlay,
			),
			this.store.enablePremiumFeatures$(),
		]).pipe(
			this.mapData(([[currentScene], [showLottery, lotteryOverlay], isPremium]) => {
				return (
					lotteryOverlay &&
					currentScene === SceneMode.GAMEPLAY &&
					// Check for null so that by default it doesn't show up for premium users
					(showLottery === true || (!isPremium && showLottery === null))
				);
			}),
			this.handleReposition(),
		);
	}
}
