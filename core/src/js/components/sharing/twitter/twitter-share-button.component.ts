import { Overlay, OverlayPositionBuilder } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	ElementRef,
	HostListener,
	ViewRef,
} from '@angular/core';
import { OverwolfService } from '../../../services/overwolf.service';
import { SocialShareButtonComponent } from '../social-share-button.component';
import { TwitterShareModalComponent } from './twitter-share-modal.component';

declare let amplitude;

@Component({
	selector: 'twitter-share-button',
	styleUrls: [
		`../../../../css/component/sharing/social-share-button.component.scss`,
		`../../../../css/component/sharing/twitter/twitter-share-button.component.scss`,
	],
	template: `
		<div
			class="social-share {{ _network }}"
			helpTooltip="Share current screen on {{ networkTitle }}"
			[inlineSVG]="networkSvg"
		></div>
		<div class="label" *ngIf="showLabel">Twitter</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TwitterShareButtonComponent extends SocialShareButtonComponent {
	constructor(
		protected readonly ow: OverwolfService,
		protected readonly overlay: Overlay,
		protected readonly elementRef: ElementRef,
		protected readonly overlayPositionBuilder: OverlayPositionBuilder,
		protected readonly cdr: ChangeDetectorRef,
	) {
		super(ow, overlay, elementRef, overlayPositionBuilder, cdr);
		this.network = 'twitter';
	}

	@HostListener('mousedown')
	onClick() {
		this.startSharing();
	}

	protected async doShare(screenshotLocation: string, base64Image: string) {
		const portal = new ComponentPortal(TwitterShareModalComponent);

		const modalRef = this.overlayRef.attach(portal);
		modalRef.instance.base64Image = base64Image;
		modalRef.instance.closeHandler = () => this.overlayRef.detach();
		modalRef.instance.fileLocation = screenshotLocation;
		console.log('instanciated modalRef', null);
		if (!(this.cdr as ViewRef)?.destroyed) {
			this.cdr.detectChanges();
		}

		const userInfo = await this.ow.getTwitterUserInfo();
		modalRef.instance.socialUserInfo = userInfo;
		console.log('instanciated modalRef 2', userInfo);
		if (!(this.cdr as ViewRef)?.destroyed) {
			this.cdr.detectChanges();
		}

		this.positionStrategy.apply();
	}
}
