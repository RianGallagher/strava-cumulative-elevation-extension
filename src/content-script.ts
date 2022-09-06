const path = window.location.pathname;
const [, endPoint, id] = path.split("/");

let activityData: Array<{ distance: string; elevation: number; elevationGain: number }>;
let isElevationObserverActive = false;

/**
 * Send the background script the activityId so it can request the elevation data for the activity and format the data.
 */
if (endPoint === "activities") {
    chrome.runtime.sendMessage({ activityId: id }, function (response) {
        activityData = response.activityData;
    });
}

/**
 * Send the background script the routeId so it can request the elevation data for the route and format the data.
 */
if (endPoint === "routes") {
    chrome.runtime.sendMessage({ routeId: id }, function (response) {
        activityData = response.activityData;
    });
}

const findElevationAtPoint = (elevationElement: HTMLElement | null) => {
    if (endPoint === "activities") {
        const distanceElement = document.getElementById("infobox-text-distance");
        const distanceValue = distanceElement?.querySelector(".value")?.textContent;

        const elevationValue = parseInt(elevationElement?.querySelector(".value")?.textContent ?? "");

        return activityData.find(
            ({ distance, elevation }) => distance === distanceValue && elevation === elevationValue
        );
    } else {
        const distanceValue = document.querySelector(".crossbar-text")?.textContent ?? "";
        return activityData.find(({ distance }) => distance === distanceValue);
    }
};

const elevationChartObserver = new MutationObserver((mutationRecords) => {
    const elevationProfile = mutationRecords[mutationRecords.length - 1].target;
    const infoBox = document.getElementById("infoBox");
    if (infoBox !== null && Array.isArray(activityData)) {
        // We'll be editing the elevation chart so unobserve during edit to stop infinite loops.
        elevationChartObserver.disconnect();

        const elevationElement = document.getElementById(
            endPoint === "activities" ? "infobox-text-altitude" : "infobox-text-Elev"
        );
        const elevationAtPoint = findElevationAtPoint(elevationElement);

        if (typeof elevationAtPoint !== "undefined") {
            const { elevationGain } = elevationAtPoint;
            const elevationString = `  ${Math.round(elevationGain)} m`;

            const cumulativeGainElement = document.getElementById("cumulative-elevation-value");

            if (cumulativeGainElement !== null) {
                cumulativeGainElement.childNodes[0].replaceWith(elevationString);
            } else {
                // Increase the width to fit the gain value.
                infoBox.querySelector("rect")?.setAttribute("width", "175");

                if (elevationElement !== null) {
                    const title = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
                    title.setAttribute("pointer-events", "none");
                    title.append(" Gain: ");
                    elevationElement.append(title);

                    const value = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
                    value.setAttribute("id", "cumulative-elevation-value");
                    value.setAttribute("pointer-events", "none");
                    value.setAttribute("font-weight", "bold");
                    value.append(elevationString);
                    elevationElement.append(value);
                }
            }
        }

        elevationChartObserver.observe(elevationProfile, { childList: true, subtree: true });
    }
});

const getElevationProfileElement = () => {
    if (endPoint === "activities") {
        return document.getElementById("elevation-profile");
    }

    return document.querySelector(".chartGroup");
};

const pageObserver = new MutationObserver(() => {
    const elevationProfile = getElevationProfileElement();
    if (isElevationObserverActive === false && elevationProfile !== null) {
        elevationChartObserver.observe(elevationProfile, { childList: true, subtree: true });
        isElevationObserverActive = true;
    }

    if (isElevationObserverActive === true && elevationProfile === null) {
        isElevationObserverActive = false;
    }
});

window.addEventListener("load", () => {
    const page = document.querySelector(".page");
    if (page !== null) {
        pageObserver.observe(page, { childList: true, subtree: true });
    }
});
