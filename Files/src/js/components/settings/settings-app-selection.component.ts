import { Component, ViewEncapsulation, ChangeDetectionStrategy, Output, EventEmitter } from '@angular/core';

@Component({
	selector: 'settings-app-selection',
	styleUrls: [
		`../../../css/global/components-global.scss`,
		`../../../css/global/menu.scss`,
		`../../../css/component/settings/settings-app-selection.component.scss`
	],
	template: `
        <ul class="menu-selection">
            <li class="disabled">
                <span>The Binder</span>
            </li>
            <li [ngClass]="{'selected': selectedApp == 'achievements'}">
                <span (click)="changeSelection('achievements')">Achievements</span>
            </li>
            <li [ngClass]="{'selected': selectedApp == 'decktracker'}">
                <span (click)="changeSelection('decktracker')">Deck Tracker</span>
            </li>
        </ul>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsAppSelectionComponent {

    selectedApp: string = 'achievements';
    @Output() onAppSelected = new EventEmitter<string>();

    changeSelection(selection: string) {
        this.selectedApp = selection;
        this.onAppSelected.next(selection);
    }
}
