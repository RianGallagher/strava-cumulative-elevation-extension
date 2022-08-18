const path = window.location.pathname;
const activityId = path.split("/")[2];

let elevationThing: Array<{ distance: string; elevation: number; elevationGain: number }>;

const cumulativeElevationDiv = document.createElement("div");
cumulativeElevationDiv.setAttribute("position", "absolute");
cumulativeElevationDiv.setAttribute("id", "info-textbox-cumulative-elevation");
cumulativeElevationDiv.append("test");
document.getElementById("elevation-profile")?.append(cumulativeElevationDiv);

// const appendElevationToInfoBox = () => {
//     if (document.getElementById("info-textbox-cumulative-elevation") !== null) {
//         document.getElementById("info-textbox-cumulative-elevation")?.remove();
//     }
//     const elevationElement = document.getElementById("infobox-text-altitude");
//     const height = elevationElement?.getAttribute("height");
//     const width = elevationElement?.getAttribute("width");
//     // const display = elevationElement.getAttribute("display");
//     const newElement = document.createElementNS("http://www.w3.org/2000/svg", "text");
//     newElement.setAttribute("id", "info-textbox-cumulative-elevation");
//     newElement.setAttribute("x", "10");
//     if (typeof width === "number" && typeof height === "number") {
//         newElement.setAttribute("width", width);
//         newElement.setAttribute("height", height);
//     }
//     newElement.setAttribute("pointer-events", "none");
//     newElement.setAttribute("y", "112");

//     const title = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
//     title.setAttribute("class", "title");
//     title.setAttribute("pointer-events", "none");
//     title.append("TElevation: ");
//     newElement.append(title);

//     const value = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
//     value.setAttribute("class", "value");
//     value.setAttribute("pointer-events", "none");
//     value.setAttribute("font-weight", "bold");
//     value.append("234");
//     newElement.append(value);

//     document.getElementById("infoBox")?.append(newElement);
// };

const elevationChartObserver = new MutationObserver(() => {
    if (document.getElementById("infoBox") !== null && Array.isArray(elevationThing)) {
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
            cumulativeElevationDiv.childNodes[0].replaceWith(elevationGain.toString());
        }
        elevationChartObserver.observe(document.getElementById("elevation-profile")!, {
            childList: true,
            subtree: true,
        });
    }
});

elevationChartObserver.observe(document.getElementById("elevation-profile")!, { childList: true, subtree: true });

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
