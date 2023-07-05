console.log("working...");

function addBox() {
    const videoContainer = document.getElementsByClassName('watch-video')[0];
    const box = document.createElement('div');
    box.style.width = '200px';
    box.style.height = '200px';
    box.style.backgroundColor = 'red';
    box.style.position = 'absolute';
    box.style.zIndex = '100';
    videoContainer.appendChild(box);
}

// addBox();

// detect video play/pause
const playPauseObserver = new MutationObserver(mutationList => {
    mutationList.forEach(mutation => {
        mutation.addedNodes.forEach(addedNode => {
            if (addedNode.classList.contains('playback-notification--play')) {
                console.log('played');
            }
            else if (addedNode.classList.contains('playback-notification--pause')) {
                console.log('paused');
            }
        });
    });
});

playPauseObserver.observe(document.getElementsByClassName('watch-video')[0], { subtree: false, childList: true });

// detect pause overlay added
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
