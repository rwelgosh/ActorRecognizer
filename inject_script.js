let isVideoPaused;

console.log('test');

// detect video play/pause
const playPauseObserver = new MutationObserver(mutationList => {
    mutationList.forEach(mutation => {
        mutation.addedNodes.forEach(addedNode => {
            if (addedNode.classList.contains('playback-notification--play')) {
                isVideoPaused = false;
                console.log('played');
            }
            else if (addedNode.classList.contains('playback-notification--pause')) {
                isVideoPaused = true;
                console.log('paused');
                // hide caption text when paused
                const captionText = document.getElementsByClassName('player-timedtext')[0];
                captionText.style.display = 'none';
                // console.log('hid caption text');
            }
        });
    });
});

playPauseObserver.observe(document.getElementsByClassName('watch-video')[0], { subtree: false, childList: true });

// detect and hide pause overlay
const pauseOverlayObserver = new MutationObserver(mutationList => {
    mutationList.forEach(mutation => {
        mutation.addedNodes.forEach(addedNode => {
            if (addedNode.classList.contains('watch-video--evidence-overlay-container')) {
                addedNode.style.display = 'none';
                console.log('pause overlay detected and hidden');
            }
        });
    });
});

pauseOverlayObserver.observe(document.getElementsByClassName('watch-video')[0], { subtree: true, childList: true });

// detect and hide age advisor when paused
const ageAdvisorObserver = new MutationObserver(mutationList => {
    mutationList.forEach(mutation => {
        mutation.addedNodes.forEach(addedNode => {
            if (isVideoPaused && addedNode.classList.contains('advisory')) {
                addedNode.style.display = 'none';
                console.log('age advisor detected and hidden');
            }
        });
    });
});

ageAdvisorObserver.observe(document.getElementsByClassName('watch-video')[0], { subtree: true, childList: true });



// get the actor data
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.status === "actor data") {
            const actorData = request.data;
            const boundingBox = actorData.CelebrityFaces[0].Face.BoundingBox
            console.log(boundingBox);
            addBox(boundingBox.Width, boundingBox.Height, boundingBox.Left, boundingBox.Top);
            sendResponse({message:"received", paused:isVideoPaused});
            return true;
        }
    }
);

function addBox(width, height, left, top) {
    const videoContainer = document.getElementsByClassName('watch-video')[0];
    const box = document.createElement('div');
    box.style.width = `${width * window.innerWidth}px`;
    box.style.height = `${height * window.innerHeight}px`;
    box.style.left = `${left * window.innerWidth}px`;
    box.style.top = `${top * window.innerHeight}px`;
    box.style.backgroundColor = 'red';
    box.style.opacity = '0.5';
    box.style.position = 'absolute';
    box.style.zIndex = '100';
    videoContainer.appendChild(box);
}

