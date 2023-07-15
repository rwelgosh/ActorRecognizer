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

            }
        });
    });
});

playPauseObserver.observe(document.getElementsByClassName('watch-video')[0], { subtree: false, childList: true });

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if( request.status === "actor data" ) {
            var actor_data = request.data
            console.log(actor_data);

            sendResponse({message:"received", paused:isVideoPaused});
            return true;
        }
    }
);
