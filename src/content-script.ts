const path = window.location.pathname;
const activityId = path.split("/")[2];

let activityData: Array<{ distance: string; elevation: number; elevationGain: number }>;

/**
 * Send the background script the activityId so it can request the elevation data for the activity and format the data.
 */
chrome.runtime.sendMessage({ activityId }, function (response) {
    activityData = response.activityData;
});

const elevationChartObserver = new MutationObserver(() => {
    const infoBox = document.getElementById("infoBox");
    if (infoBox !== null && Array.isArray(activityData)) {
        // We'll be editing the elevation chart so unobserve during edit to stop infinite loops.
        elevationChartObserver.disconnect();

        const distanceElement = document.getElementById("infobox-text-distance");
        const distanceValue = distanceElement?.querySelector(".value")?.textContent;

        const elevationElement = document.getElementById("infobox-text-altitude");
        const elevationValue = parseInt(elevationElement?.querySelector(".value")?.textContent ?? "");

        const elevationAtPoint = activityData.find(
            ({ distance, elevation }) => distance === distanceValue && elevation === elevationValue
        );

        if (typeof elevationAtPoint !== "undefined") {
            const { elevationGain } = elevationAtPoint;
            const elevationString = `  ${Math.round(elevationGain)} m`;

            const cumulativeGainElement = document.getElementById("cumulative-elevation-value");

            if (cumulativeGainElement !== null) {
                cumulativeGainElement.childNodes[0].replaceWith(elevationString);
            } else {
                // Increase the width to fit the gain value.
                infoBox.querySelector("rect")?.setAttribute("width", "175");

                const title = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
                title.setAttribute("class", "title");
                title.setAttribute("pointer-events", "none");
                title.append(" Gain: ");
                elevationElement?.append(title);

                const value = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
                value.setAttribute("class", "value");
                value.setAttribute("id", "cumulative-elevation-value");
                value.setAttribute("pointer-events", "none");
                value.setAttribute("font-weight", "bold");
                value.append(elevationString);
                elevationElement?.append(value);
            }
        }

        elevationChartObserver.observe(document.getElementById("elevation-profile")!, {
            childList: true,
            subtree: true,
        });
    }
});

elevationChartObserver.observe(document.getElementById("elevation-profile")!, { childList: true, subtree: true });
