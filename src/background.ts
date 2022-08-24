const CLIENT_ID = 36878;
const CLIENT_SECRET = "9b4967784e1f5e505f5c649d0afaf6c17be1470a";

const isTokenExpired = (expiresAt: number) => {
    // expiresAt is stored as seconds since epoch so the current date needs to be same format.
    const timeNow = new Date().getTime() / 1000;
    return timeNow > expiresAt;
};

/**
 * Get the Strava API access token from local storage or, if it's expired, request a new token with the refresh token.
 * @returns Access token for making request to the Strava API.
 */
const getToken = async () => {
    const { token, refreshToken, expiresAt } = await chrome.storage.local.get(["token", "refreshToken", "expiresAt"]);
    if (isTokenExpired(expiresAt)) {
        const result = await fetch("https://www.strava.com/api/v3/oauth/token", {
            method: "post",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                refresh_token: refreshToken,
                grant_type: "refresh_token",
            }),
        });

        const { access_token, expires_at, refresh_token } = await result.json();
        chrome.storage.local.set({ token: access_token, refreshToken: refresh_token, expiresAt: expires_at });
        return access_token;
    }

    return token;
};

/**
 * Format the activity data to include distance, elevation and cumulative elevation.
 * @param elevationArray The array of elevation at different points in the activity.
 * @param distanceArray  The array of distance at different points in the activity.
 * @returns An array of objects containing distance, elevation and elevation gain.
 */
const formatActivityData = (elevationArray: number[], distanceArray: number[]) => {
    const activityData = elevationArray.reduce<Array<{ distance: string; elevation: number; elevationGain: number }>>(
        (acc, elevation, index) => {
            const cumulativeSoFar = acc[acc.length - 1]?.elevationGain ?? 0;
            let elevationGain = cumulativeSoFar;

            if (index < elevationArray.length - 1) {
                const nextElevation = elevationArray[index + 1];
                const difference = nextElevation - elevation;

                if (difference > 0) {
                    elevationGain = cumulativeSoFar + difference;
                }
            }

            const distance = `${(distanceArray[index] / 1000).toFixed(1)} km`;
            return [...acc, { distance, elevation, elevationGain }];
        },
        []
    );

    return activityData;
};

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
