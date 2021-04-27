export class PPEvent<T> {
    callbacks: EventHandler<T>[];
    protected static callbackIDCounter = 0;

    private registerCallback = (callback: (...args: T[]) => void): number => {
        const id = ++PPEvent.callbackIDCounter;
        this.callbacks.push({
            id, callback
        });

        return id;
    }

    constructor() {
        this.callbacks = [];
    }

    public dispatchEvent = (eventArgs: T) => {
        for (const eventCallback of this.callbacks) {
            eventCallback.callback(eventArgs);
        }
    };

    public addEventListener = (callback: EventCallback<T>): number => {
        return this.registerCallback(callback);
    };

    public removeCallback = (id: number) => {
        for (let i = 0; i < this.callbacks.length; i++) {
            const callbackEvent = this.callbacks[i];
            if (callbackEvent.id === id) {
                console.log(`remove ${i}`);
                this.callbacks.splice(i, 1);
                break;
            }
        }
    };

    public unlistenAll = () => {
        this.callbacks = [];
    };

    public afterNextValidEvent(checkFunction: (event: T) => boolean, callback = (eventCallback: T) => {
    }) {
        let id = 0;
        const handler: EventCallback<T> = (event) => {
            if (checkFunction(event)) {
                callback(event);
                this.removeCallback(id);
            }
        };

        id = this.addEventListener(handler)
    }
}

export interface EventHandler<T> {
    id: number;
    callback: EventCallback<T>;
}

export type EventCallback<T> = (event: T, ...args) => void;
