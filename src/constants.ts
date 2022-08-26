export const CLIENT_ID = 36878;
export const CLIENT_SECRET = "9b4967784e1f5e505f5c649d0afaf6c17be1470a";

const SCOPE = "activity:read_all";
export const STRAVA_URL = `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=:redirectUrl/exchange_token&approval_prompt=force&scope=${SCOPE}`;
