/**
 * This is a custom event implementation, that focuses on processing callbacks
 * as soon as possible.
 */
export class PPEvent<T> {
    callbacks: { [key: string]: EventHandler<T> };
    protected static callbackIDCounter = 0;

    private registerCallback = (callback: (...args: T[]) => void): number => {
        const id = ++PPEvent.callbackIDCounter;
        this.callbacks[`callback_${id}`] = {
            id, callback
        };

        return id;
    }

    constructor() {
        this.callbacks = {};
    }

    public dispatchEvent = (eventArgs: T) => {
        const timestamp = Date.now();
        const callbacks = Object.entries(this.callbacks);
        if (callbacks.length > 0) {
            this.runCallbacks(callbacks[0][1].id, eventArgs);
        }
    };

    private runCallbacks(id: number, eventArgs: T) {
        const callbacks = Object.entries(this.callbacks);
        const index = callbacks.findIndex(pair => pair[1].id === id);
        if (this.callbacks.hasOwnProperty(`callback_${id}`) && this.callbacks[`callback_${id}`] !== undefined) {
            this.callbacks[`callback_${id}`].callback(eventArgs);
            const nextIndex = (index < callbacks.length - 1) ? index + 1 : -1;
            if (nextIndex > -1) {
                const nextID = callbacks[nextIndex][1].id;
                this.runCallbacks(nextID, eventArgs);
            }
        }
    }

    public addEventListener = (callback: EventCallback<T>): number => {
        return this.registerCallback(callback);
    };

    public removeCallback = (id: number) => {
        if (this.callbacks.hasOwnProperty(`callback_${id}`)) {
            delete this.callbacks[`callback_${id}`];
        }
    };

    public unlistenAll = () => {
        this.callbacks = {};
    };

    public afterNextValidEvent(checkFunction: (event: T) => boolean, callback = (eventCallback: T) => {
    }) {
        let id = 0;
        const handler: EventCallback<T> = (event) => {
            if (checkFunction(event)) {
                this.removeCallback(id);
                callback(event);
            }
        };

        id = this.addEventListener(handler);
        return id;
    }
}

export interface EventHandler<T> {
    id: number;
    callback: EventCallback<T>;
}

export type EventCallback<T> = (event: T, ...args) => void;
