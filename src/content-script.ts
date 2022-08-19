const path = window.location.pathname;
const activityId = path.split("/")[2];

let elevationThing: Array<{ distance: string; elevation: number; elevationGain: number }>;

const elevationChartObserver = new MutationObserver(() => {
    const infoBox = document.getElementById("infoBox");
    if (infoBox !== null && Array.isArray(elevationThing)) {
        // We'll be editing the elevation chart so unobserve during edit to stop infinite loops.
        elevationChartObserver.disconnect();

        const distance = document.getElementById("infobox-text-distance");
        const distanceValue = distance?.querySelector(".value")?.textContent;

        const elevation = document.getElementById("infobox-text-altitude");
        const elevationValue = parseInt(elevation?.querySelector(".value")?.textContent ?? "");

        const elevationAtPoint = elevationThing.find(
            ({ distance, elevation }) => distance === distanceValue && elevation === elevationValue
        );

        if (typeof elevationAtPoint !== "undefined") {
            const { elevationGain } = elevationAtPoint;
            const elevationString = `  ${elevationGain} m`;

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
                elevation?.append(title);

                const value = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
                value.setAttribute("class", "value");
                value.setAttribute("id", "cumulative-elevation-value");
                value.setAttribute("pointer-events", "none");
                value.setAttribute("font-weight", "bold");
                value.append(elevationString);
                elevation?.append(value);
            }
        }

        elevationChartObserver.observe(document.getElementById("elevation-profile")!, {
            childList: true,
            subtree: true,
        });
    }
});

elevationChartObserver.observe(document.getElementById("elevation-profile")!, { childList: true, subtree: true });

/**
 * Send the background script the activityId so it can request the elevation data for the activity. Format the data
 * into an array of objects with distance, elevation and elevationGain.
 */
chrome.runtime.sendMessage({ activityId }, function (response) {
    const elevationArray: Array<{ elevation: number; distance: string }> = response.elevationArray;
    const thing = elevationArray.reduce<Array<{ distance: string; elevation: number; elevationGain: number }>>(
        (acc, elevationArrayItem, index) => {
            const { elevation, distance } = elevationArrayItem;
            const cumulativeSoFar = acc[acc.length - 1]?.elevationGain ?? 0;
            let nextGain = cumulativeSoFar;
            if (index < elevationArray.length - 1) {
                const { elevation: nextElevation } = elevationArray[index + 1];
                const difference = nextElevation - elevation;
                if (difference < 0) {
                    nextGain = cumulativeSoFar;
                } else {
                    nextGain = cumulativeSoFar + difference;
                }
            }
            return [...acc, { distance, elevation, elevationGain: nextGain }];
        },
        []
    );
    elevationThing = thing;
});
