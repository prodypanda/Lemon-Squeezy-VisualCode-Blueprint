import { ApiService } from '../services/apiService';
import { CONFIG } from '../config';
import { EventEmitter } from 'events';

export class NetworkMonitor extends EventEmitter {
    private isOnline: boolean = true;
    private lastOnlineTime: number = Date.now();
    private checkInterval: NodeJS.Timer;

    constructor() {
        super();
        this.checkInterval = setInterval(
            () => this.checkConnection(),
            CONFIG.TIMING.ONLINE_PING_INTERVAL
        );
    }

    private async checkConnection(): Promise<void> {
        const wasOnline = this.isOnline;
        this.isOnline = await ApiService.ping();

        if (this.isOnline) {
            this.lastOnlineTime = Date.now();
        }

        if (wasOnline !== this.isOnline) {
            this.emit('statusChange', this.isOnline);
        }

        if (!this.isOnline) {
            const offlineDuration = Date.now() - this.lastOnlineTime;
            if (offlineDuration > CONFIG.TIMING.OFFLINE_DURATION_LIMIT) {
                this.emit('offlineLimitExceeded');
            }
        }
    }

    public getStatus(): { isOnline: boolean; lastOnlineTime: number } {
        return {
            isOnline: this.isOnline,
            lastOnlineTime: this.lastOnlineTime
        };
    }

    public dispose(): void {
        clearInterval(this.checkInterval);
    }
}
