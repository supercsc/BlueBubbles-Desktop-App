import { ipcMain, BrowserWindow } from "electron";
import { Connection } from "typeorm";

// Config and FileSystem Imports
import { Config } from "@server/databases/config/entity/Config";
import { FileSystem } from "@server/fileSystem";
import { DEFAULT_GENERAL_ITEMS } from "@server/constants";

// Database Imports
import { ConfigRepository } from "@server/databases/config";
import { ChatRepository } from "@server/databases/chat";

// Service Imports
import { SocketService } from "@server/services";

import { ResponseFormat, ChatResponse, MessageResponse } from "./types";
import { GetChatMessagesParams } from "./services/socket/types";

export class BackendServer {
    window: BrowserWindow;

    db: Connection;

    chatRepo: ChatRepository;

    configRepo: ConfigRepository;

    socketService: SocketService;

    fs: FileSystem;

    setupComplete: boolean;

    servicesStarted: boolean;

    constructor(window: BrowserWindow) {
        this.window = window;

        // Databases
        this.chatRepo = null;
        this.configRepo = null;

        // Other helpers
        this.fs = null;

        // Services
        this.socketService = null;

        this.setupComplete = false;
        this.servicesStarted = false;
    }

    /**
     * Starts the back-end "server"
     */
    async start(): Promise<void> {
        console.log("Starting BlueBubbles Backend...");
        await this.setup();

        try {
            console.log("Launching Services..");
            await this.setupServices();
        } catch (ex) {
            console.log("Failed to launch server services.", "error");
        }

        console.log("Starting Configuration IPC Listeners...");
        this.startIpcListeners();

        // Fetch the chats upon start
        console.log("Syncing initial chats...");
        await this.fetchChats();
    }

    /** https://0a561bfc47cb.ngrok.io
     * dc04685f-7bc4-4966-9a08-e66a26365fd7
     * Sets up the server by initializing a "filesystem" and other
     * tasks such as setting up the databases and internal services
     */
    private async setup(): Promise<void> {
        console.log("Initializing database...");
        await this.initializeDatabases();

        try {
            console.log("Initializing filesystem...");
            this.fs = new FileSystem();
            this.fs.setup();
        } catch (ex) {
            console.log(`!Failed to setup filesystem! ${ex.message}`);
        }

        this.setupComplete = true;
    }

    private async initializeDatabases() {
        try {
            console.log("Connecting to messaging database...");
            this.chatRepo = new ChatRepository();
            await this.chatRepo.initialize();
        } catch (ex) {
            console.log(`Failed to connect to messaging database! ${ex.message}`);
            console.log(ex);
        }

        try {
            console.log("Connecting to settings database...");
            this.configRepo = new ConfigRepository();
            await this.configRepo.initialize();
        } catch (ex) {
            console.log(`Failed to connect to settings database! ${ex.message}`);
        }

        await this.setupDefaults();
    }

    /**
     * Sets up default database values for configuration items
     */
    private async setupDefaults(): Promise<void> {
        try {
            const repo = this.configRepo.db.getRepository(Config);
            for (const key of Object.keys(DEFAULT_GENERAL_ITEMS)) {
                const item = await repo.findOne({ name: key });
                if (!item) await this.configRepo.setConfigItem(key, DEFAULT_GENERAL_ITEMS[key]());
            }
        } catch (ex) {
            console.log(`Failed to setup default configurations! ${ex.message}`);
        }
    }

    /**
     * Sets up any internal services that need to be instantiated and configured
     */
    private async setupServices(override = false) {
        if (this.servicesStarted && !override) return;

        try {
            console.log("Initializing up socket connection...");
            this.socketService = new SocketService(this.db, this.chatRepo, this.configRepo, this.fs);

            // Start the socket service
            await this.socketService.start();
        } catch (ex) {
            console.log(`Failed to setup socket service! ${ex.message}`);
        }

        this.servicesStarted = true;
    }

    /**
     * Fetches chats from the server based on the last time we fetched data.
     * This is what the server itself calls when it is refreshed or reloaded.
     * The front-end _should not_ call this function.
     */
    async fetchChats(): Promise<void> {
        if (!this.socketService?.socketServer?.connected) {
            console.warn("Cannot fetch chats when no socket is connected!");
            return;
        }

        const emitData = {
            loading: true,
            syncProgress: 0,
            loginIsValid: true,
            loadingMessage: "Connected to the server! Fetching chats...",
            redirect: null
        };

        const now = new Date();
        const lastFetch = this.configRepo.getConfigItem("lastFetch") as number;
        const chats: ChatResponse[] = await this.socketService.getChats({});

        emitData.syncProgress = 1;
        emitData.loadingMessage = `Got ${chats.length} chats from the server. Fetching messages since ${new Date(
            lastFetch
        )}`;
        console.log(emitData.loadingMessage);
        this.emitToUI("setup-update", emitData);

        // Iterate over each chat and fetch their messages
        let count = 1;
        for (const chat of chats) {
            // First, emit the chat to the front-end
            this.emitToUI("chat", chat);

            // Second, save the chat to the database
            const chatObj = ChatRepository.createChatFromResponse(chat);
            const savedChat = await this.chatRepo.saveChat(chatObj);

            // Third, save the participants for the chat
            for (const participant of chat.participants ?? []) {
                const handle = ChatRepository.createHandleFromResponse(participant);
                await this.chatRepo.saveHandle(savedChat, handle);
            }

            // Build message request params
            const payload: GetChatMessagesParams = { withChats: false, limit: 25, offset: 0, withBlurhash: true };
            if (lastFetch) {
                payload.after = lastFetch;
                // Since we are fetching after a date, we want to get as much as we can
                payload.limit = 1000;
            }

            // Third, let's fetch the messages from the DB
            const one = new Date();
            const messages: MessageResponse[] = await this.socketService.getChatMessages(chat.guid, payload);
            const two = new Date();
            console.log(`Fetch took ${two.getTime() - one.getTime()} ms`);
            emitData.loadingMessage = `Syncing ${messages.length} messages for ${count} of ${chats.length} chats`;
            console.log(emitData.loadingMessage);

            // Fourth, let's save the messages to the DB
            for (const message of messages) {
                const msg = ChatRepository.createMessageFromResponse(message);
                await this.chatRepo.saveMessage(savedChat, msg);
            }

            // Lastly, save the attachments (if any)
            // TODO

            emitData.syncProgress = Math.ceil((count / chats.length) * 100);
            if (emitData.syncProgress > 100) emitData.syncProgress = 100;
            this.emitToUI("setup-update", emitData);
            count += 1;
        }

        // Tell the UI we are finished
        const later = new Date();
        emitData.redirect = "/messaging";
        emitData.syncProgress = 100;
        emitData.loadingMessage = `Finished fetching messages from socket server in [${later.getTime() -
            now.getTime()} ms].`;
        console.log(emitData.loadingMessage);
        this.emitToUI("setup-update", emitData);

        // Save the last fetch date
        this.configRepo.setConfigItem("lastFetch", now);
    }

    private startIpcListeners() {
        ipcMain.handle("set-config", async (event, args) => {
            for (const item of Object.keys(args)) {
                const hasConfig = this.configRepo.hasConfigItem(item);
                if (hasConfig && this.configRepo.getConfigItem(item) !== args[item]) {
                    await this.configRepo.setConfigItem(item, args[item]);
                }
            }

            this.emitToUI("config-update", this.configRepo.config);
            return this.configRepo.config;
        });

        ipcMain.handle("start-socket-setup", async (_, args) => {
            const errData = {
                loading: true,
                syncProgress: 0,
                loginIsValid: false,
                loadingMessage: "Setup is starting..."
            };

            // Make sure the config DB is setup
            if (!this.configRepo || !this.configRepo.db.isConnected) {
                errData.loadingMessage = "Configuration DB is not yet setup!";
                return this.emitToUI("setup-update", errData);
            }

            // Save the config items
            await this.configRepo.setConfigItem("serverAddress", args.enteredServerAddress);
            await this.configRepo.setConfigItem("passphrase", args.enteredPassword);

            try {
                // If we can't even connect, GTFO
                await this.socketService.start(true);
            } catch {
                errData.loadingMessage = "Could not connect to the server!";
                return this.emitToUI("setup-update", errData);
            }

            // Wait 1 second to see if we got disconnected
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Now check if we are disconnected. If creds are wrong, we will get disconnected here
            if (!this.socketService.socketServer.connected) {
                errData.loadingMessage = "Disconnected from socket server! Credentials may be incorrect!";
                return this.emitToUI("setup-update", errData);
            }

            // Start fetching the data
            this.fetchChats();
            return null; // Consistent return
        });

        // eslint-disable-next-line no-return-await
        ipcMain.handle("get-chats", async (_, args) => await this.chatRepo.getChats());

        // eslint-disable-next-line no-return-await
        ipcMain.handle("get-chat-messages", async (_, args) => await this.chatRepo.getMessages(args));
    }

    private emitToUI(event: string, data: any) {
        if (this.window) this.window.webContents.send(event, data);
    }
}
