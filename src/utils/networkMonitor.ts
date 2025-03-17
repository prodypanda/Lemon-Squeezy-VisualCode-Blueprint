// src/utils/networkMonitor.ts
import { ApiService } from '../services/apiService';
import { CONFIG } from '../config';
import { EventEmitter } from 'events';

export class NetworkMonitor extends EventEmitter {
    private checkInterval: NodeJS.Timer;

    constructor() {
        super();
        this.checkInterval = setInterval(
            () => this.checkConnection(),
            CONFIG.TIMING.ONLINE_PING_INTERVAL
        );
    }

    private async checkConnection(): Promise<void> {
        const isOnline = await ApiService.ping();
        this.emit('statusChange', isOnline); // Emit only when status changes
    }

    public async getStatus(): Promise<boolean> {
        return await ApiService.ping();
    }

    public dispose(): void {
        clearInterval(this.checkInterval);
    }
}