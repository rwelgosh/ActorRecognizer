const api_key = "4e030ef294d25cb08d568e060ace3699";
const api_base_url = 'https://api.themoviedb.org/3/';
const profile_image_base_url = 'https://image.tmdb.org/t/p/w185';
const poster_image_base_url = 'https://image.tmdb.org/t/p/w342';

// hard coded names to change
const actorNameReplacements = {
    'Gabriel Delmotte': 'Gabriel Macht'
};

let isVideoPaused;
let thisProductionTitle;

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
            // create an array of the identified actors
            const identifiedActors = [];
            for (const face of actorData.CelebrityFaces) {
                let actorName = face.Name;
                if (actorName in actorNameReplacements) {
                    actorName = actorNameReplacements[actorName];
                }
                identifiedActors.push(actorName);
            }
            console.log(identifiedActors);

            for (const actorName of identifiedActors) {

                const formattedName = actorName.replaceAll(' ', '%20');

                (async () => {
                
                    const actorId = await getActorIdFromName(formattedName);
                    // console.log(actorId);
    
                    const actorPlaying = await getActorPlaying(actorId, thisProductionTitle);
                    // console.log(actorPlaying);
    
                    const actorImageUrl = await getActorImage(actorId);
                    // console.log(actorImageUrl);
    
                    const actorBio = await getActorBio(actorId);
                    // console.log(actorBio);
    
                    const topFiveProductions = await getTopFiveProductions(actorId);
    
                    const displayProductions = removeThisProduction(topFiveProductions, thisProductionTitle);
                    // console.log(displayProductions);
    
                    addInfoCard(actorName, actorPlaying, actorImageUrl, actorBio, displayProductions);
                        
                })();    

            }

            // add boxes over faces
            for (const face of actorData.CelebrityFaces) {
                const boundingBox = face.Face.BoundingBox;
                addFaceBox(boundingBox.Width, boundingBox.Height, boundingBox.Left, boundingBox.Top);
            }
            
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

async function getActorBio(actorId, page=1) {
    let data = [];
    try {
        const response = await fetch(`${api_base_url}person/${actorId}?api_key=${api_key}&page=${page}`);
        data = await response.json();
    } catch (error) {}
    console.log('bio data', data);
    // get the first 222 characters
    const length = 222;
    const displayBio = data.biography.slice(0, length+1) + '...';
    return displayBio;
}

async function getTopFiveProductions(actorId, page=1) {
    let data = [];
    try {
        const response = await fetch(`${api_base_url}person/${actorId}/combined_credits?api_key=${api_key}&language=en-US&page=${page}`);
        data = await response.json();
    } catch (error) {}

    const productions = [];
    for (const production of data.cast) {

        // console.log(production);

        const productionData = new Object;

        // ignore minor TV roles
        if ('episode_count' in production && production.episode_count <= 2) {
            continue;
        }

        // ignore talk show guest appearances; 10767 = talk show, 10763 = news show
        if ((production.genre_ids.includes(10767) || production.genre_ids.includes(10763))
            && production.episode_count <= 20) {
            continue;
        }

        // add title
        if ('title' in production && production.title !== null) { 
            // don't include numbered sequels
            if (endsInNumber(production.title)) { continue; }
            productionData['title'] = production.title; 
        } else if ('name' in production && production.name !== null) { 
            productionData['title'] = production.name; 
        } else { continue; }

        // add year
        if ('release_date' in production && production.release_date !== null) {
            const year = production.release_date.slice(0, 4);
            productionData['year'] = year;
        } 
        else if ('first_air_date' in production && production.first_air_date !== null) {
            const firstAirYear = production.first_air_date.slice(0, 4);
            productionData['year'] = [firstAirYear, null]; // [firstAirYear, lastAirYear] -- lastAirYear to be called for later
            // const firstAirYear = production.first_air_date.slice(0, 4);
            // // make call to get last air date
            // (async () => {
            //     const lastAirYear = await getLastAirYear(production.id);
            //     productionData['year'] = firstAirYear + '–' + lastAirYear;
            // })();
        } 
        else { continue; }

        // add popularity
        if ('popularity' in production && production.popularity !== null) { 
            productionData['popularity'] = production.popularity; 
        } else { continue; } 

        // add poster path
        if ('poster_path' in production && production.poster_path !== null) {
            productionData['posterPath'] = production.poster_path;
        } else { continue; } 

        // add id 
        if ('id' in production && production.id !== null) {
            productionData['id'] = production.id;
        } else { continue; } 

        // finally, add production object to productions array
        const preLoopLength = productions.length;
        let i = 0;
        while (i < productions.length) {
            if (productions[i].popularity < productionData.popularity) {
                productions.splice(i, 0, productionData);
                break;
            } else { i++; }
        }
        // if did not insert
        if (productions.length === preLoopLength) {
            productions.push(productionData);
        }
        if (productions.length > 5) {
            productions.pop()
        }
        // console.log(productionData);
    }
    return productions;
}

function endsInNumber(title) {
    return /[0-9]/.test(title.slice(-1));
}

async function getLastAirYear(tvId) {
    let data = [];
    try {
        const response = await fetch(`${api_base_url}tv/${tvId}?api_key=${api_key}&language=en-US`);
        data = await response.json();
    } catch (error) {}
    return data.last_air_date.slice(0, 4);
}

function removeThisProduction(topFiveProductions, thisProductionTitle) {
    let i = 0;
    while (i < topFiveProductions.length) {
        if (topFiveProductions[i].title === thisProductionTitle) {
            topFiveProductions.splice(i, 1);
        } else {
            i ++;
        }
    }
    // if this production not in top 5, remove last production
    if (topFiveProductions.length === 5) {
        topFiveProductions.pop();
    }
    return topFiveProductions;
}



// add info card
function addInfoCard(actorName, actorPlaying, actorImageUrl, actorBio, displayProductions) {

    (async () => {

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
        cardHeaderLeft.insertAdjacentHTML('afterend', '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="10" viewBox="0 0 18 10" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M9.7071 0.292893L17.7071 8.29289C18.0976 8.68342 18.0976 9.31658 17.7071 9.70711C17.3166 10.0976 16.6834 10.0976 16.2929 9.70711L8.99999 2.41421L1.7071 9.70711C1.31657 10.0976 0.68341 10.0976 0.292886 9.70711C-0.0976385 9.31658 -0.0976388 8.68342 0.292886 8.29289L8.29289 0.292893C8.68341 -0.0976309 9.31658 -0.0976309 9.7071 0.292893Z" fill="white" fill-opacity="0.9"/></svg>');
        // card header -> done
    
        // card bio
        const cardBio = document.createElement('div');
        cardBio.classList.add('card-bio');
        // p
        const p = document.createElement('p');
        let pText = document.createTextNode(actorBio);
        if (actorBio === '...') {
            pText = document.createTextNode(`We couldn't find a biography for ${actorName}.`);
        }
        p.appendChild(pText);
        cardBio.appendChild(p);
        // read more
        const readMore = document.createElement('div');
        readMore.classList.add('read-more');
        // small text - read more
        const smallTextReadMore = document.createElement('div');
        smallTextReadMore.classList.add('small-text');
        let smallTextReadMoreText = document.createTextNode('Read More');
        if (actorBio === '...') {
            smallTextReadMoreText = document.createTextNode('Visit profile on TMDB');
        }

        // decrease height if no bio
        

        smallTextReadMore.appendChild(smallTextReadMoreText);
        readMore.appendChild(smallTextReadMore);
        smallTextReadMore.insertAdjacentHTML('afterend', '<svg xmlns="http://www.w3.org/2000/svg" width="6" height="11" viewBox="0 0 6 11" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.35226 5.95956L1.10962 10.2022C0.855779 10.456 0.444221 10.456 0.190381 10.2022C-0.0634601 9.94836 -0.0634603 9.5368 0.190381 9.28296L3.9734 5.49994L0.190381 1.71692C-0.0634603 1.46308 -0.0634601 1.05152 0.190381 0.79768C0.444221 0.54384 0.855779 0.543839 1.10962 0.797681L5.35226 5.04032C5.6061 5.29416 5.6061 5.70572 5.35226 5.95956Z" fill="white" fill-opacity="0.6"/></svg>');
        cardBio.appendChild(readMore);
        infoCardContent.appendChild(cardBio);
        // card bio -> done
    
        // small text – other productions
        const smallTextOtherProductions = document.createElement('div');
        smallTextOtherProductions.classList.add('small-text', 'other-productions');
        const smallTextOtherProductionsText = document.createTextNode('Other Movies and TV Shows');
        smallTextOtherProductions.appendChild(smallTextOtherProductionsText);
        infoCardContent.appendChild(smallTextOtherProductions);
        // small text – other productions -> done
    
        // productions container
        const productionsContainer = document.createElement('div');
        productionsContainer.classList.add('productions-container');
        // for each display production 
        for (const displayProduction of displayProductions) {
            // production
            const production = document.createElement('div');
            production.classList.add('production');
            // production image container
            const productionImageContainer = document.createElement('div');
            productionImageContainer.classList.add('production-image-container');
            productionImageContainer.style.backgroundImage = `url(${poster_image_base_url + displayProduction.posterPath})`;
            production.appendChild(productionImageContainer);
            // production text
            const productionText = document.createElement('div');
            productionText.classList.add('production-text');
            // small text - production title
            const smallTextProductionTitle = document.createElement('div');
            smallTextProductionTitle.classList.add('small-text', 'production-title');
            const smallTextProductionTitleText = document.createTextNode(displayProduction.title);
            smallTextProductionTitle.appendChild(smallTextProductionTitleText);
            productionText.appendChild(smallTextProductionTitle);
            // small text - production year
            if (displayProduction.year.constructor === Array) {
                const firstAirYear = displayProduction.year[0]
                // make call to get last air date
                const lastAirYear = await getLastAirYear(displayProduction.id);
                displayProduction.year = firstAirYear + '–' + lastAirYear;
            }
            const smallTextProductionYear = document.createElement('div');
            smallTextProductionYear.classList.add('small-text', 'production-year');
            const smallTextProductionYearText = document.createTextNode(displayProduction.year);
            smallTextProductionYear.appendChild(smallTextProductionYearText);
            productionText.appendChild(smallTextProductionYear);
            production.appendChild(productionText);
    
            productionsContainer.appendChild(production);
        }
        infoCardContent.appendChild(productionsContainer);
        // productions container -> done     

    })();

}


// add box over face
function addFaceBox(width, height, left, top) {
    const videoContainer = document.getElementsByClassName('watch-video')[0];
    const box = document.createElement('div');
    box.style.width = `${width * window.innerWidth}px`;
    box.style.height = `${height * window.innerHeight}px`;
    box.style.left = `${left * window.innerWidth}px`;
    box.style.top = `${top * window.innerHeight}px`;
    box.classList.add('face-box')
    videoContainer.appendChild(box);
}

