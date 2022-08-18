chrome.runtime.onInstalled.addListener(async () => {
    const { token } = await chrome.storage.local.get("token");
    console.log(`token`, token);
    chrome.tabs.create({ url: "index.html" });
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log(sender.tab ? "from a content script:" + sender.tab.url : "from the extension");
    const fetchStravaElevation = async () => {
        const { token } = await chrome.storage.local.get("token");
        const result = await fetch(
            `https://www.strava.com/api/v3/activities/${request.activityId}/streams?keys=altitude`,
            {
                headers: { authorization: `Bearer ${token}` },
            }
        );
        const [distance, elevation]: [{ data: number[] }, { data: number[] }] = await result.json();
        const elevationArray = elevation.data.map((elevation, index) => ({
            elevation,
            distance: `${(distance.data[index] / 1000).toFixed(1)} km`,
        }));

        console.log(`elevationArray`, elevationArray);
        sendResponse({ elevationArray });
    };
    if (typeof request.activityId === "string") {
        fetchStravaElevation();
    }
    return true;
});
