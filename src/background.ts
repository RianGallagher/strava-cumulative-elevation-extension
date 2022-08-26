import { formatActivityData, getToken } from "./utilities.js";

/**
 * When the extension if first installed, open a HTML file which invites the user to log in to Strava and give the
 * required permissions to the extension.
 */
chrome.runtime.onInstalled.addListener(async () => {
    const { token } = await chrome.storage.local.get("token");

    if (typeof token === "undefined") {
        chrome.tabs.create({ url: "index.html" });
    }
});

/**
 * Listen for the content script message with the activity ID and request the elevation data for that activity.
 */
chrome.runtime.onMessage.addListener(function (request, _sender, sendResponse) {
    const fetchStravaElevation = async () => {
        const token = await getToken();

        const fetchOptions = { headers: { authorization: `Bearer ${token}` } };
        const result = await fetch(
            `https://www.strava.com/api/v3/activities/${request.activityId}/streams?keys=altitude`,
            fetchOptions
        );

        const [distance, elevation]: [{ data: number[] }, { data: number[] }] = await result.json();

        const activityData = formatActivityData(elevation.data, distance.data);

        sendResponse({ activityData });
    };

    if (typeof request.activityId === "string") {
        fetchStravaElevation();
    }

    return true;
});
