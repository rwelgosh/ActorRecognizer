const api_key = "4e030ef294d25cb08d568e060ace3699";
const api_base_url = 'https://api.themoviedb.org/3/';
const image_base_url = 'https://image.tmdb.org/t/p/original';
const profile_image_base_url = 'https://image.tmdb.org/t/p/w185';

let isVideoPaused;
let thisProductionTitle;

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
                // grab current production title
                thisProductionTitle = document.querySelector('h4').innerHTML;
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
                // console.log('pause overlay detected and hidden');
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
                // console.log('age advisor detected and hidden');
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
            const actorName = actorData.CelebrityFaces[0].Name;
            const formattedName = actorName.replaceAll(' ', '%20');

            (async () => {
                
                const actorId = await getActorIdFromName(formattedName);
                console.log(actorId);

                const actorPlaying = await getActorPlaying(actorId, thisProductionTitle);
                console.log(actorPlaying);

                const actorImageUrl = await getActorImage(actorId);
                console.log(actorImageUrl);

                addInfoCard(actorName, actorPlaying, actorImageUrl);







                
            
                
            
            
                // const topFiveProductions = await getTopFiveProductions(31);
                // console.log(topFiveProductions);
            
                // const movieDuration = await getMovieDuration(13);
                // console.log(movieDuration);
            
                // const lastAirDate = await getLastAirYear(2316);
                // console.log(lastAirDate);
            
            })();
            


            const boundingBox = actorData.CelebrityFaces[0].Face.BoundingBox
            addBox(boundingBox.Width, boundingBox.Height, boundingBox.Left, boundingBox.Top);
            sendResponse({message:"received", paused:isVideoPaused});
            return true;
        }
    }
);




async function getActorIdFromName(actorName, page=1) {
    let data = [];
    try {
        const response = await fetch(`${api_base_url}search/person?query=${actorName}&api_key=${api_key}&include_adult=false&language=en-US&page=${page}`)
        data = await response.json();
    }
    catch (error) {}
    console.log(data);
    return data.results[0].id
}

async function getActorImage(actorId, page=1) {
    let data = [];
    try {
        const response = await fetch(`${api_base_url}person/${actorId}/images?api_key=${api_key}&page=${page}`);
        data = await response.json();
    } catch (error) {}
    return profile_image_base_url + data.profiles[0].file_path;
}

async function getActorPlaying(actorId, productionTitle, page=1) {
    let data = [];
    let character;
    try {
        const response = await fetch(`${api_base_url}person/${actorId}/combined_credits?api_key=${api_key}&language=en-US&page=${page}`);
        data = await response.json();
        data.cast.forEach(production => {
            if (production.title === productionTitle || production.name === productionTitle) {
                character = production.character;
            }
        });
    } catch (error) {}
    return character;
}


// add info card
function addInfoCard(actorName, actorPlaying, actorImageUrl) {
    const videoContainer = document.getElementsByClassName('watch-video')[0];
    // card background
    const infoCardBackground = document.createElement('div');
    infoCardBackground.classList.add('info-card-background');
    videoContainer.appendChild(infoCardBackground);
    // card content
    const infoCardContent = document.createElement('div');
    infoCardContent.classList.add('info-card-content');
    videoContainer.appendChild(infoCardContent);
    // card header
    const cardHeader = document.createElement('div');
    cardHeader.classList.add('card-header');
    // card header left
    const cardHeaderLeft = document.createElement('div');
    cardHeaderLeft.classList.add('card-header-left');
    // header image container
    const headerImageContainer = document.createElement('div');
    headerImageContainer.classList.add('header-image-container');
    headerImageContainer.style.backgroundImage = `url(${actorImageUrl})`;
    cardHeaderLeft.appendChild(headerImageContainer);
    // header text
    const headerText = document.createElement('div');
    headerText.classList.add('header-text');
    // h1
    const h1 = document.createElement('h1');
    const h1Text = document.createTextNode(actorName);
    h1.appendChild(h1Text);
    headerText.appendChild(h1);
    // h2
    const h2 = document.createElement('h2');
    const h2Text = document.createTextNode(actorPlaying);
    h2.appendChild(h2Text);
    headerText.appendChild(h2);
    cardHeaderLeft.appendChild(headerText);
    cardHeader.appendChild(cardHeaderLeft);
    infoCardContent.appendChild(cardHeader);

    
}


// add box over face
function addBox(width, height, left, top) {
    const videoContainer = document.getElementsByClassName('watch-video')[0];
    const box = document.createElement('div');
    box.style.width = `${width * window.innerWidth}px`;
    box.style.height = `${height * window.innerHeight}px`;
    box.style.left = `${left * window.innerWidth}px`;
    box.style.top = `${top * window.innerHeight}px`;
    box.classList.add('face-box')
    videoContainer.appendChild(box);
}

