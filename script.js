chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
    if (message.enabled) {
        find_faces()
    }
});

find_faces = () => {
    //Do Something to find faces and then draw them

    label_faces();
};

label_faces = (actor_positions, actor_labels) => {
    
};