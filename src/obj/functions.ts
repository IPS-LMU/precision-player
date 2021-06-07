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
