import { CLIENT_ID, CLIENT_SECRET, STRAVA_URL } from "./constants.js";

const authenticate = () => {
    const redirectUrl = `https://${chrome.runtime.id}.chromiumapp.org/provider_cb`;
    const url = STRAVA_URL.replace(":redirectUrl", encodeURIComponent(redirectUrl));

    const options = { interactive: true, url };

    chrome.identity.launchWebAuthFlow(options, async function (redirectUri) {
        if (chrome.runtime.lastError) {
            console.log(`chrome.runtime.lastError`, chrome.runtime.lastError);
            // callback(new Error(chrome.runtime.lastError));
            return;
        }

        const searchParams = new URLSearchParams(redirectUri);
        const code = searchParams.get("code");

        const result = await fetch("https://www.strava.com/api/v3/oauth/token", {
            method: "post",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                code,
                grant_type: "authorization_code",
            }),
        });
        const { access_token, expires_at, refresh_token } = await result.json();

        chrome.storage.local.set({ token: access_token, refreshToken: refresh_token, expiresAt: expires_at });
    });
};

document.getElementById("sign-in")?.addEventListener("click", authenticate);
