import { Component, Input, ChangeDetectionStrategy, ChangeDetectorRef, ElementRef, AfterViewInit, HostListener, EventEmitter } from '@angular/core';
import { VisualAchievement } from '../../models/visual-achievement';
import { DomSanitizer, SafeUrl, SafeHtml } from '@angular/platform-browser';
import { ReplayInfo } from '../../models/replay-info';
import { ThumbnailInfo } from '../../models/achievement/thumbnail-info';
import { PreferencesService } from '../../services/preferences.service';
import { MainWindowStoreEvent } from '../../services/mainwindow/store/events/main-window-store-event';
import { VideoReplayDeletionRequestEvent } from '../../services/mainwindow/store/events/achievements/video-replay-deletion-request-event';
import { SimpleIOService } from '../../services/plugins/simple-io.service';
import { SocialShareUserInfo } from '../../models/mainwindow/social-share-user-info';

declare var overwolf;
declare var ga;

@Component({
	selector: 'achievement-recordings',
	styleUrls: [`../../../css/component/achievements/achievement-recordings.component.scss`],
	template: `
        <div class="achievement-recordings" *ngIf="currentThumbnail">
            <vg-player [ngClass]="{'deleted': currentThumbnail.isDeleted}">
                <div class="title" [innerHTML]="title"></div>
                <fs-overlay-play></fs-overlay-play>

                <vg-controls>
                    <vg-play-pause></vg-play-pause>            
                    <fs-time-display vgProperty="current" vgFormat="mm:ss"></fs-time-display>
                    <fs-time-display vgProperty="total" vgFormat="mm:ss"></fs-time-display>
            
                    <vg-scrub-bar [vgSlider]="true">
                        <vg-scrub-bar-current-time [vgSlider]="true"></vg-scrub-bar-current-time>
                    </vg-scrub-bar>
            
                    <vg-mute></vg-mute>
                    <vg-volume></vg-volume>
                    
                    <i class="video-folder" (click)="openVideoFolder()">
                        <svg>
                            <use xlink:href="/Files/assets/svg/sprite.svg#video_folder"/>
                        </svg>
                    </i>
            
                    <vg-fullscreen [ngClass]="{ 'fullscreen': fullscreen }"></vg-fullscreen>
                </vg-controls>

                <achievement-social-shares 
                        *ngIf="false && !currentThumbnail.isDeleted"
                        [socialShareUserInfo]="socialShareUserInfo"
                        [achievementName]="_achievement.name"
                        [title]="title"
                        [videoPathOnDisk]="currentVideoPathOnDisk"
                        [videoPath]="currentReplayLocation">
                </achievement-social-shares>

                <video [vgMedia]="media" #media id="singleVideo" preload="auto">
                    <source [src]="currentReplay" type="video/mp4">
                </video>
            </vg-player>
            <div class="no-media" *ngIf="currentThumbnail.isDeleted">
                <i>
                    <svg>
                        <use xlink:href="/Files/assets/svg/sprite.svg#no_media"/>
                    </svg>
                </i>
                <span>Media deleted</span>
            </div>

            <div class="thumbnails">
                <i class="page-arrow previous-page"  
                        [ngClass]="{'disabled': indexOfFirstShown === 0}"
                        (click)="goToPreviousPage()"
                        *ngIf="thumbnails.length > THUMBNAILS_PER_PAGE">
                    <svg>
                        <use xlink:href="/Files/assets/svg/sprite.svg#carousel_arrow"/>
                    </svg>
                </i>
                <ul>
                    <div class="offset" [style.marginLeft.px]="thumbnailsOffsetX"></div>
                    <achievement-thumbnail 
                            *ngFor="let thumbnail of thumbnails"
                            [ngClass]="{'inDeletion': thumbnail.inDeletion}"
                            (click)="showReplay(thumbnail, $event)"
                            (deletionRequest)="onDeletionRequest(thumbnail, $event)"
                            [highlighted]="pendingDeletion === thumbnail"
                            [thumbnail]="thumbnail" 
                            [currentThumbnail]="currentThumbnail">
                    </achievement-thumbnail>
                </ul>
                <i class="page-arrow next-page" 
                        [ngClass]="{'disabled': indexOfFirstShown === thumbnails.length - THUMBNAILS_PER_PAGE}" 
                        (click)="goToNextPage()"
                        *ngIf="thumbnails.length > THUMBNAILS_PER_PAGE">
                    <svg>
                        <use xlink:href="/Files/assets/svg/sprite.svg#carousel_arrow"/>
                    </svg>
                </i>
            </div>
            <div class="zth-tooltip confirmation-popup right" 
                    *ngIf="showConfirmationPopup"
                    [style.top.px]="confirmationTop"
                    [style.left.px]="confirmationLeft">
                <p>Are you sure?</p>
                <div class="buttons">
                    <button (click)="hideConfirmationPopup($event)" class="cancel"><span>Cancel</span></button>
                    <button (click)="deleteMedia(pendingDeletion)" class="confirm"><span>Delete</span></button>
                </div>
                <div class="dont-ask" (click)="toggleDontAsk($event)">
                    <input hidden type="checkbox" name="" id="a-01">
                    <label for="a-01">
                        <i class="unchecked" *ngIf="!dontAsk">
                            <svg>
                                <use xlink:href="/Files/assets/svg/sprite.svg#unchecked_box"/>
                            </svg>
                        </i>
                        <i class="checked" *ngIf="dontAsk">
                            <svg>
                                <use xlink:href="/Files/assets/svg/sprite.svg#checked_box"/>
                            </svg>
                        </i>
                        <p>Don't ask me again</p>
                    </label>
                </div>
                <svg class="tooltip-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9">
                    <polygon points="0,0 8,-9 16,0"/>
                </svg>
            </div>
            <div class="delete-notification" [ngClass]="{'hidden': !showDeleteNotification}">
                Replay deleted
            </div>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AchievementRecordingsComponent implements AfterViewInit {

    private readonly THUMBNAILS_PER_PAGE = 5;

    @Input() socialShareUserInfo: SocialShareUserInfo;
    _achievement: VisualAchievement;

    thumbnails: ThumbnailInfo[] = [];

    currentThumbnail: ThumbnailInfo;
    currentReplayLocation: string;
    currentVideoPathOnDisk: string;
    currentReplay: SafeUrl;
    title: SafeHtml;
    fullscreen: boolean = false;
    indexOfFirstShown = 0;
    thumbnailsOffsetX: number = 0;
    thumbnailWidth: number = 102; // TODO: retrieve this from actual size
    
    pendingDeletion: ThumbnailInfo;
    showConfirmationPopup: boolean;
    dontAsk: boolean = false;
    confirmationTop: number = 0;
    confirmationLeft: number = 0;
    showDeleteNotification: boolean;

    private player;
	private stateUpdater: EventEmitter<MainWindowStoreEvent>;

	@Input() set achievement(achievement: VisualAchievement) {
        this._achievement = achievement;
        setTimeout(() => {
            this.updateThumbnails(achievement.replayInfo);
            this.cdr.detectChanges();            
        })
    }

    constructor(
        private io: SimpleIOService,
        private elRef: ElementRef, 
        private cdr: ChangeDetectorRef, 
        private prefs: PreferencesService,
        private sanitizer: DomSanitizer) { 
    }
    
    ngAfterViewInit() {
		this.stateUpdater = overwolf.windows.getMainWindow().mainWindowStoreUpdater;
        this.player = this.elRef.nativeElement.querySelector('video');
        if (!this.player) {
            setTimeout(() => this.ngAfterViewInit(), 50);
        }
    }

    showReplay(thumbnail: ThumbnailInfo, event: MouseEvent) {
        event.stopPropagation();
        if (this.currentThumbnail === thumbnail) {
            return;
        }
        this.updateThumbnail(thumbnail);
        this.player.load();
        this.player.play();
        this.cdr.detectChanges();
    }

    openVideoFolder() {
        overwolf.utils.openWindowsExplorer(this.currentReplayLocation, (result) => { console.log('opened', result) });
    }

    goToPreviousPage() {
        this.indexOfFirstShown = Math.max(0, this.indexOfFirstShown - this.THUMBNAILS_PER_PAGE);
        this.thumbnailsOffsetX = -this.indexOfFirstShown * this.thumbnailWidth;
        this.cdr.detectChanges();
    }

    goToNextPage() {
        this.indexOfFirstShown = Math.min(
            this.indexOfFirstShown + this.THUMBNAILS_PER_PAGE, 
            this.thumbnails.length - this.THUMBNAILS_PER_PAGE);
        this.thumbnailsOffsetX = -this.indexOfFirstShown * this.thumbnailWidth;
        console.log('thumnailOffset', this.thumbnailsOffsetX);
        this.cdr.detectChanges();
    }

    async onDeletionRequest(thumbnail: ThumbnailInfo, event) {
        console.log('on deletionRequest', thumbnail, event);
        this.dontAsk = (await this.prefs.getPreferences()).dontConfirmVideoReplayDeletion;
        if (this.dontAsk) {
            await this.deleteMedia(thumbnail);
        }
        else {
            this.showConfirmationPopup = true;
            this.pendingDeletion = thumbnail;
            const container = this.elRef.nativeElement.querySelector('.achievement-recordings').getBoundingClientRect();
            this.confirmationTop = event.top - container.top + 55;
            this.confirmationLeft = event.left - container.left + 130;
        }
        this.cdr.detectChanges();
    }

    async deleteMedia(thumbnail: ThumbnailInfo) {
        ga('send', 'event', 'delete-media');
        console.log('deleting media', thumbnail);
        // All this is not really clean, we should probably have the state drive ALL of the UI interactions, 
        // and just have the views reflect the state of the store
        this.stateUpdater.next(new VideoReplayDeletionRequestEvent(thumbnail.stepId, thumbnail.videoPath));
        thumbnail.inDeletion = true;
        this.showDeleteNotification = true;
        this.cdr.detectChanges();
        setTimeout(() => {
            thumbnail.inDeletion = false;
            this.showDeleteNotification = false;
            this.cdr.detectChanges();
        }, 1500);
    }

    toggleDontAsk(event: Event) {
        event.stopPropagation();
        this.dontAsk = !this.dontAsk;
        this.prefs.setDontConfirmVideoDeletion(this.dontAsk);
        this.cdr.detectChanges();
    }

    hideConfirmationPopup(event: MouseEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.showConfirmationPopup = false;
        this.pendingDeletion = undefined;
        this.cdr.detectChanges();
    }
    
	// Prevent the window from being dragged around if user drags controls
	@HostListener('mousedown', ['$event'])
	onHistoryClick(event: MouseEvent) {
        const path: any[] = event["path"];
        for (let elem of path) {
            if (elem.localName === 'vg-controls') {
                event.stopPropagation();
                return;
            }
        }
    }

	@HostListener('document:webkitfullscreenchange', ['$event'])
	onFullScreenChange(event) {
        this.fullscreen = !this.fullscreen;
        this.cdr.detectChanges();
    }

    private async updateThumbnails(replayInfo: ReadonlyArray<ReplayInfo>) {
        const deletedPaths: string[] = await this.buildDeletedPaths(replayInfo);
        this.thumbnails = replayInfo
                .map((info) => {
                    return {
                        timestamp: info.creationTimestamp,
                        completionDate: new Date(info.creationTimestamp).toLocaleDateString(
                            "en-GB",
                            { day: "2-digit", month: "2-digit", year: "2-digit"} ),
                        videoLocation: info.url,
                        videoPath: info.path,
                        videoUrl: this.sanitizer.bypassSecurityTrustUrl(info.url),
                        thumbnail: this.sanitizer.bypassSecurityTrustUrl(info.thumbnailUrl),
                        stepId: info.completionStepId,
                        iconSvg: this.buildIconSvg(info.completionStepId),
                        isDeleted: deletedPaths.indexOf(info.path) !== -1,
                    } as ThumbnailInfo
                })
                .sort((a, b) => b.timestamp - a.timestamp);
        this.thumbnailsOffsetX = -this.indexOfFirstShown * this.thumbnailWidth;
        console.log('updated thumbnails', this.thumbnails);
        this.updateThumbnail(this.thumbnails[this.indexOfFirstShown]);
        this.cdr.detectChanges();
    }
    
    private updateThumbnail(thumbnail: ThumbnailInfo) {
        console.log('updating thumbnail', thumbnail);
        this.currentThumbnail = thumbnail;
        this.currentVideoPathOnDisk = this.currentThumbnail 
                ? this.currentThumbnail.videoPath 
                : undefined;
        this.currentReplayLocation = this.currentThumbnail 
                ? this.currentThumbnail.videoLocation 
                : undefined;
        this.currentReplay = this.currentReplayLocation 
                ? this.sanitizer.bypassSecurityTrustUrl(this.currentReplayLocation) 
                : undefined;
        this.updateTitle();
    }

    private async isDeleted(path: string): Promise<boolean> {
        const fileExists = await this.io.fileExists(path);
        console.log('fileExists in component?', fileExists);
        return !fileExists;
    }

    private async buildDeletedPaths(replayInfo: ReadonlyArray<ReplayInfo>): Promise<string[]> {
        const deletedPaths: string[] = [];
        for (let info of replayInfo) {
            console.log('considering delete', info, info.path);
            const isDeleted: boolean = await this.isDeleted(info.path);
            console.log('is deleted?', isDeleted);
            if (isDeleted) {
                deletedPaths.push(info.path);
            }
        }
        console.log('deleted', deletedPaths);
        return deletedPaths;
    }

    private updateTitle() {
        if (!this.currentThumbnail) {
            return;
        }
        const date = new Date(this.currentThumbnail.timestamp).toLocaleDateString(
                "en-GB",
                { day: "2-digit", month: "2-digit", year: "2-digit"} );
        this.title = this.sanitizer.bypassSecurityTrustHtml(`
            <i class="icon">
                <svg class="svg-icon-fill">
                    <use xlink:href="/Files/assets/svg/sprite.svg#${this.buildIcon(this.currentThumbnail.stepId)}"/>
                </svg>
            </i>
            <div class="text">${this.buildText()}</div>
            <div class="date">${date}</div>
        `);
    }

    private buildIconSvg(stepId: string) {
        return this.sanitizer.bypassSecurityTrustHtml(`
            <i class="icon-svg">
                <svg class="svg-icon-fill">
                    <use xlink:href="/Files/assets/svg/sprite.svg#${this.buildIcon(stepId)}"/>
                </svg>
            </i>`);
    }

    private buildIcon(stepId: string): string {
        return this._achievement.completionSteps
                .find((step) => step.id === stepId)
                .iconSvgSymbol;
    }

    private buildText(): string {
        return this._achievement.completionSteps
                .find((step) => step.id === this.currentThumbnail.stepId)
                .text(false);
    }
}