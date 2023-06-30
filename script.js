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

addBox();