import { CLIENT_ID, CLIENT_SECRET } from "./constants.js";

const isTokenExpired = function (expiresAt: number) {
    // expiresAt is stored as seconds since epoch so the current date needs to be same format.
    const timeNow = new Date().getTime() / 1000;
    return timeNow > expiresAt;
};

const getNewToken = async function () {
    const { refreshToken } = await chrome.storage.local.get(["refreshToken"]);

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
};

/**
 * Get the Strava API access token from local storage or, if it's expired, request a new token with the refresh token.
 * @returns Access token for making request to the Strava API.
 */
const getToken = async function () {
    const { token, expiresAt } = await chrome.storage.local.get(["token", "expiresAt"]);
    if (isTokenExpired(expiresAt)) {
        const newToken = await getNewToken();
        return newToken;
    }

    return token;
};

export const fetchElevationData = async (request: any) => {
    const token = await getToken();

    const fetchOptions = { headers: { authorization: `Bearer ${token}` } };

    const route = typeof request?.activityId === "string" ? "activities" : "routes";
    const id = typeof request?.activityId === "string" ? request.activityId : request.routeId;

    const result = await fetch(`https://www.strava.com/api/v3/${route}/${id}/streams?keys=altitude`, fetchOptions);
    return await result.json();
};

/**
 * Format the activity data to include distance, elevation and cumulative elevation.
 * @param elevationArray The array of elevation at different points in the activity.
 * @param distanceArray  The array of distance at different points in the activity.
 * @returns An array of objects containing distance, elevation and elevation gain.
 */
export const formatActivityData = function (elevationArray: number[], distanceArray: number[]) {
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
