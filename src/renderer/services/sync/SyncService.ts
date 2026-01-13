// =============================================================================
// SyncService - Orchestration de la synchronisation Local <-> Supabase
// =============================================================================

import { db, SyncOperation } from '../db';
import { networkMonitor } from './NetworkMonitor';
import { supabase, isSupabaseConfigured } from '../supabase';

class SyncService {
    private syncInProgress = false;
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly DEBOUNCE_MS = 1000;
    private readonly SYNC_INTERVAL_MS = 30000;
    private readonly MAX_RETRIES = 5;
    private readonly REQUEST_TIMEOUT_MS = 10000; // 10 secondes max par requête

    constructor() {
        // Réagit aux changements de connectivité
        networkMonitor.subscribe((online) => {
            if (online) {
                console.log('🔄 SyncService: Back online, triggering sync...');
                this.triggerSync();
            }
        });

        // Synchronisation périodique (toutes les 30s si en ligne)
        setInterval(() => {
            if (networkMonitor.isOnline() && isSupabaseConfigured()) {
                this.triggerSync();
            }
        }, this.SYNC_INTERVAL_MS);

        console.log('🔄 SyncService: Initialized');

        // Test de connexion Supabase au démarrage
        this.testSupabaseConnection();
    }

    /**
     * Test de diagnostic de la connexion Supabase
     */
    private async testSupabaseConnection(): Promise<void> {
        console.log('🧪 SyncService: Testing Supabase connection...');
        console.log('🧪 SyncService: isSupabaseConfigured =', isSupabaseConfigured());

        try {
            // Test avec fetch natif pour voir si le réseau fonctionne
            console.log('🧪 SyncService: Testing raw fetch...');
            const fetchResult = await fetch('https://ahjvlbyyyxexrheptunp.supabase.co/rest/v1/', {
                method: 'HEAD',
                headers: {
                    'apikey': process.env.SUPABASE_ANON_KEY || ''
                }
            });
            console.log('🧪 SyncService: Raw fetch result:', fetchResult.status, fetchResult.statusText);
            console.log('🧪 SyncService: Connection test passed ✅');
        } catch (err) {
            console.error('🧪 SyncService: Connection test failed:', err);
        }
    }

    /**
     * Planifie une synchronisation avec debounce
     * Appelé après chaque écriture locale
     */
    scheduleSync(): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => this.triggerSync(), this.DEBOUNCE_MS);
    }

    /**
     * Déclenche une synchronisation complète (push + pull)
     */
    async triggerSync(): Promise<void> {
        // Guards
        if (this.syncInProgress) {
            console.log('🔄 SyncService: Sync already in progress, skipping...');
            return;
        }
        if (!networkMonitor.isOnline()) {
            console.log('🔄 SyncService: Offline, skipping sync');
            return;
        }
        if (!isSupabaseConfigured()) {
            console.log('🔄 SyncService: Supabase not configured, skipping sync');
            return;
        }

        this.syncInProgress = true;
        console.log('🔄 SyncService: Starting sync...');

        try {
            // 1. Envoie les opérations en attente vers le cloud
            await this.pushPendingOperations();

            // 2. Récupère les changements depuis le cloud
            await this.pullRemoteChanges();

            console.log('🔄 SyncService: Sync completed successfully ✅');
        } catch (error) {
            console.error('🔄 SyncService: Sync failed ❌', error);
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * PUSH : Envoie les opérations locales en attente vers Supabase
     */
    private async pushPendingOperations(): Promise<void> {
        const pendingOps = await db.syncQueue.orderBy('createdAt').toArray();

        if (pendingOps.length === 0) {
            console.log('🔄 SyncService: No pending operations to push');
            return;
        }

        console.log(`🔄 SyncService: Pushing ${pendingOps.length} pending operations...`);

        for (const op of pendingOps) {
            try {
                await this.executeOperation(op);
                // Succès : supprime de la file
                await db.syncQueue.delete(op.id);
                // Met à jour le statut de l'entité
                await this.markEntityAsSynced(op.entity, op.entityId);
            } catch (error) {
                console.error(`🔄 SyncService: Operation ${op.id} failed`, error);

                // Incrémente le compteur de retry
                const newRetryCount = op.retryCount + 1;
                if (newRetryCount >= this.MAX_RETRIES) {
                    console.error(`🔄 SyncService: Operation ${op.id} exceeded max retries, marking as error`);
                    await this.markEntityAsError(op.entity, op.entityId);
                    await db.syncQueue.delete(op.id);
                } else {
                    await db.syncQueue.update(op.id, { retryCount: newRetryCount });
                }
            }
        }
    }

    /**
     * Exécute une opération de synchronisation sur Supabase via REST API
     * Utilise fetch directement car le client Supabase bloque dans Electron
     */
    private async executeOperation(op: SyncOperation): Promise<void> {
        const table = op.entity === 'conversation' ? 'conversations' : 'messages';
        const payload = this.transformForRemote(op.payload, op.entity);
        const baseUrl = process.env.SUPABASE_URL;
        const apiKey = process.env.SUPABASE_ANON_KEY;

        if (!baseUrl || !apiKey) {
            throw new Error('Supabase not configured');
        }

        console.log(`🔄 SyncService: Executing ${op.type} on ${table}`, payload);

        const headers = {
            'Content-Type': 'application/json',
            'apikey': apiKey,
            'Authorization': `Bearer ${apiKey}`,
            'Prefer': 'return=representation'
        };

        let response: Response;

        switch (op.type) {
            case 'CREATE':
                console.log(`🔄 SyncService: INSERT into ${table}...`);
                response = await fetch(`${baseUrl}/rest/v1/${table}`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(payload)
                });
                break;

            case 'UPDATE':
                console.log(`🔄 SyncService: UPDATE ${table} where id=${op.entityId}...`);
                response = await fetch(`${baseUrl}/rest/v1/${table}?id=eq.${op.entityId}`, {
                    method: 'PATCH',
                    headers,
                    body: JSON.stringify(payload)
                });
                break;

            case 'DELETE':
                console.log(`🔄 SyncService: DELETE from ${table} where id=${op.entityId}...`);
                response = await fetch(`${baseUrl}/rest/v1/${table}?id=eq.${op.entityId}`, {
                    method: 'DELETE',
                    headers
                });
                break;

            default:
                throw new Error(`Unknown operation type: ${op.type}`);
        }

        const responseText = await response.text();
        console.log(`🔄 SyncService: Response ${response.status}:`, responseText);

        // 409 = duplicate key, means data already exists - treat as success
        if (!response.ok && response.status !== 409) {
            throw new Error(`HTTP ${response.status}: ${responseText}`);
        }

        if (response.status === 409) {
            console.log(`🔄 SyncService: Operation ${op.id} - data already exists, marking as synced ✅`);
        } else {
            console.log(`🔄 SyncService: Operation ${op.id} completed successfully ✅`);
        }
    }

    /**
     * Transforme les données locales pour le format Supabase
     * Ne garde QUE les colonnes qui existent dans les tables Supabase
     */
    private transformForRemote(payload: any, entity: string): Record<string, unknown> {
        if (entity === 'conversation') {
            // Table conversations: id, user_id, title, created_at, updated_at
            return {
                id: payload.id,
                user_id: payload.userId || null,
                title: payload.title,
                created_at: new Date(payload.createdAt).toISOString(),
                updated_at: new Date(payload.updatedAt).toISOString()
            };
        } else {
            // Table messages: id, conversation_id, role, content, created_at
            return {
                id: payload.id,
                conversation_id: payload.conversationId,
                role: payload.role,
                content: payload.content,
                created_at: new Date(payload.timestamp).toISOString()
            };
        }
    }

    /**
     * PULL : Récupère les changements depuis Supabase
     */
    private async pullRemoteChanges(): Promise<void> {
        const lastSyncStr = localStorage.getItem('axora_lastSyncTimestamp');
        const lastSync = lastSyncStr ? parseInt(lastSyncStr) : 0;
        const lastSyncISO = new Date(lastSync).toISOString();

        console.log(`🔄 SyncService: Pulling changes since ${lastSyncISO}`);

        // Pull conversations
        const { data: remoteConvs, error: convError } = await supabase
            .from('conversations')
            .select('*')
            .gt('updated_at', lastSyncISO);

        if (convError) {
            console.error('🔄 SyncService: Error pulling conversations', convError);
        } else if (remoteConvs && remoteConvs.length > 0) {
            console.log(`🔄 SyncService: Received ${remoteConvs.length} remote conversations`);
            await this.mergeRemoteConversations(remoteConvs);
        }

        // Pull messages
        const { data: remoteMsgs, error: msgError } = await supabase
            .from('messages')
            .select('*')
            .gt('created_at', lastSyncISO);

        if (msgError) {
            console.error('🔄 SyncService: Error pulling messages', msgError);
        } else if (remoteMsgs && remoteMsgs.length > 0) {
            console.log(`🔄 SyncService: Received ${remoteMsgs.length} remote messages`);
            await this.mergeRemoteMessages(remoteMsgs);
        }

        // Met à jour le timestamp de dernière sync
        localStorage.setItem('axora_lastSyncTimestamp', Date.now().toString());
    }

    /**
     * Merge les conversations distantes avec les données locales
     */
    private async mergeRemoteConversations(remoteConvs: any[]): Promise<void> {
        for (const remote of remoteConvs) {
            const local = await db.conversations.get(remote.id);
            const remoteUpdatedAt = new Date(remote.updated_at).getTime();

            if (!local) {
                // Nouvelle conversation du cloud
                await db.conversations.add({
                    id: remote.id,
                    title: remote.title,
                    createdAt: new Date(remote.created_at).getTime(),
                    updatedAt: remoteUpdatedAt,
                    userId: remote.user_id,
                    syncStatus: 'synced',
                    lastSyncedAt: Date.now(),
                    remoteUpdatedAt
                });
            } else if (local.syncStatus === 'synced' || remoteUpdatedAt > local.updatedAt) {
                // Remote gagne (Last Write Wins)
                await db.conversations.update(remote.id, {
                    title: remote.title,
                    updatedAt: remoteUpdatedAt,
                    syncStatus: 'synced',
                    lastSyncedAt: Date.now(),
                    remoteUpdatedAt
                });
            }
            // Si local.syncStatus === 'pending', on garde la version locale
        }
    }

    /**
     * Merge les messages distants avec les données locales
     */
    private async mergeRemoteMessages(remoteMsgs: any[]): Promise<void> {
        for (const remote of remoteMsgs) {
            const local = await db.messages.get(remote.id);

            if (!local) {
                // Nouveau message du cloud
                await db.messages.add({
                    id: remote.id,
                    conversationId: remote.conversation_id,
                    role: remote.role,
                    content: remote.content,
                    timestamp: new Date(remote.created_at).getTime(),
                    syncStatus: 'synced'
                });
            }
            // Messages sont append-only, pas de conflit possible
        }
    }

    /**
     * Marque une entité comme synchronisée
     */
    private async markEntityAsSynced(entity: string, entityId: string): Promise<void> {
        const table = entity === 'conversation' ? db.conversations : db.messages;
        await table.update(entityId, {
            syncStatus: 'synced',
            lastSyncedAt: Date.now()
        } as any);
    }

    /**
     * Marque une entité en erreur
     */
    private async markEntityAsError(entity: string, entityId: string): Promise<void> {
        const table = entity === 'conversation' ? db.conversations : db.messages;
        await table.update(entityId, { syncStatus: 'error' } as any);
    }

    /**
     * Retourne les statistiques de synchronisation
     */
    async getStats(): Promise<{ pending: number; errors: number; synced: number }> {
        const pendingConvs = await db.conversations.where('syncStatus').equals('pending').count();
        const pendingMsgs = await db.messages.where('syncStatus').equals('pending').count();
        const errorConvs = await db.conversations.where('syncStatus').equals('error').count();
        const errorMsgs = await db.messages.where('syncStatus').equals('error').count();
        const syncedConvs = await db.conversations.where('syncStatus').equals('synced').count();
        const syncedMsgs = await db.messages.where('syncStatus').equals('synced').count();

        return {
            pending: pendingConvs + pendingMsgs,
            errors: errorConvs + errorMsgs,
            synced: syncedConvs + syncedMsgs
        };
    }
}

// Singleton exporté
export const syncService = new SyncService();
