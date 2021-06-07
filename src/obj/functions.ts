/***
 * returns a HighResolutionTimestamp if supported
 */
export function getHighResTimestamp() {
    // if the polyfill is active the timestamp could be just a calculation of Date.now()
    return performance.timeOrigin + performance.now();
}

/***
 * rounds a HighResolutionTimestamp if supported
 */
export function roundHighResTimestamp(timestamp: number) {
    // if the polyfill is active the timestamp could be just a calculation of Date.now()
    return Math.ceil(timestamp);
}


/**
 * retrieves the current timestamps either from the event or from Date.now().
 * timestamps from events could be a higher precision than that from Date.now().
 * @param event
 */
export function getTimeStampByEvent(event: Event): {
    highResolution: number;
    nowMethod: number;
} {
    let now = Date.now();
    let highResNow = getHighResTimestamp();
    let highResolutionTimestamp = (event && event.timeStamp !== undefined && event.timeStamp !== null) ?
        performance.timeOrigin + event.timeStamp : highResNow;
    return {
        highResolution: highResolutionTimestamp,
        nowMethod: now
    }
}
