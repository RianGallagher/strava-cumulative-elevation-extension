const authenticate = () => {
    const REDIRECT_URL = `https://${chrome.runtime.id}.chromiumapp.org/provider_cb`;
    const SCOPE = "activity:read_all";
    const CLIENT_ID = 36878;
    const CLIENT_SECRET = "9b4967784e1f5e505f5c649d0afaf6c17be1470a";

    const url = `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(
        REDIRECT_URL
    )}/exchange_token&approval_prompt=force&scope=${SCOPE}`;
    console.log(`url`, url);

    const options = {
        interactive: true,
        url,
    };

    chrome.identity.launchWebAuthFlow(options, async function (redirectUri) {
        if (chrome.runtime.lastError) {
            console.log(`chrome.runtime.lastError`, chrome.runtime.lastError);
            // callback(new Error(chrome.runtime.lastError));
            return;
        }

        console.log(`redirectUri`, redirectUri);

        const searchParams = new URLSearchParams(redirectUri);
        const code = searchParams.get("code");
        console.log(`code`, code);

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
