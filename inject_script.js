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

            // get safeArea
            const videoContainer = document.getElementsByClassName('watch-video')[0].getBoundingClientRect();
            const safeArea = new Object;
            safeArea.height = 0.75 * videoContainer.height;
            safeArea.top = videoContainer.top + (videoContainer.height - safeArea.height) / 3;
            safeArea.width = videoContainer.width;
            safeArea.left = videoContainer.left;
            safeArea.bottom = safeArea.top + safeArea.height;
            safeArea.right = safeArea.left + safeArea.width;
            console.log('safeArea:', safeArea);
            // draw safeArea
            // const safeAreaDiv = document.createElement('div');
            // safeAreaDiv.style.height = `${safeArea.height}px`;
            // safeAreaDiv.style.top = `${safeArea.top}px`;
            // safeAreaDiv.style.width = `${safeArea.width}px`;
            // safeAreaDiv.style.left = `${safeArea.left}px`;
            // safeAreaDiv.style.position = 'absolute';
            // safeAreaDiv.style.zIndex = '190';
            // safeAreaDiv.style.backgroundColor = 'rgba(217, 217, 217, 0.50)';
            // document.getElementsByClassName('watch-video')[0].appendChild(safeAreaDiv);

            (async() => {

                for (const actorName of identifiedActors) {

                    const formattedName = actorName.replaceAll(' ', '%20');
                    
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
    
                    addInfoCard(actorId, actorName, actorPlaying, actorImageUrl, actorBio, displayProductions);

                }
                placeCardsWrapper(safeArea);
                collapseInfoCards();
    
            })();


            // add boxes over faces
            for (const face of actorData.CelebrityFaces) {
                let actorName = face.Name;
                if (actorName in actorNameReplacements) {
                    actorName = actorNameReplacements[actorName];
                }
                let faceBoxId = actorName.replaceAll(' ', '');
                faceBoxId = faceBoxId.replaceAll('.', '') + '-faceBox';
                const boundingBox = face.Face.BoundingBox;
                addFaceBox(faceBoxId, boundingBox.Width, boundingBox.Height, boundingBox.Left, boundingBox.Top);
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
function addInfoCard(actorId, actorName, actorPlaying, actorImageUrl, actorBio, displayProductions) {

    let infoCardId = actorName.replaceAll(' ', '');
    infoCardId = infoCardId.replaceAll('.', '') + '-infoCard';

    (async () => {

        const videoContainer = document.getElementsByClassName('watch-video')[0];
        
        // note that we cannot put background and content in a container div in order for
        // the blend mode to work correctly

        // card background
        const infoCardBackground = document.createElement('div');
        infoCardBackground.classList.add('info-card-background');
        infoCardBackground.id = infoCardId + 'Background';
        videoContainer.appendChild(infoCardBackground);
    
        // card content
        const infoCardContent = document.createElement('div');
        infoCardContent.classList.add('info-card-content');
        infoCardContent.id = infoCardId + 'Content';
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
        // arrow button
        const arrowButtonContainer = document.createElement('div');
        arrowButtonContainer.classList.add('arrow-button-container');
        arrowButtonContainer.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="header-arrow-icon" width="18" height="10" viewBox="0 0 18 10" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M9.7071 0.292893L17.7071 8.29289C18.0976 8.68342 18.0976 9.31658 17.7071 9.70711C17.3166 10.0976 16.6834 10.0976 16.2929 9.70711L8.99999 2.41421L1.7071 9.70711C1.31657 10.0976 0.68341 10.0976 0.292886 9.70711C-0.0976385 9.31658 -0.0976388 8.68342 0.292886 8.29289L8.29289 0.292893C8.68341 -0.0976309 9.31658 -0.0976309 9.7071 0.292893Z" fill="currentColor"/></svg>'
        arrowButtonContainer.onclick = () => { 
            console.log('test'); 
            if (infoCardContent.classList.contains('collapsed')) {
                infoCardContent.classList.remove('collapsed');
                infoCardBackground.classList.remove('collapsed');
            } else {
                infoCardContent.classList.add('collapsed');
                infoCardBackground.classList.add('collapsed');
            }
        };
        cardHeader.appendChild(arrowButtonContainer);
        infoCardContent.appendChild(cardHeader);
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
        const readMore = document.createElement('a');
        readMore.href = `https://www.themoviedb.org/person/${actorId}`;
        readMore.target = '_blank';
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
        smallTextReadMore.insertAdjacentHTML('afterend', '<svg xmlns="http://www.w3.org/2000/svg" width="6" height="11" viewBox="0 0 6 11" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.35226 5.95956L1.10962 10.2022C0.855779 10.456 0.444221 10.456 0.190381 10.2022C-0.0634601 9.94836 -0.0634603 9.5368 0.190381 9.28296L3.9734 5.49994L0.190381 1.71692C-0.0634603 1.46308 -0.0634601 1.05152 0.190381 0.79768C0.444221 0.54384 0.855779 0.543839 1.10962 0.797681L5.35226 5.04032C5.6061 5.29416 5.6061 5.70572 5.35226 5.95956Z" fill="currentColor"/></svg>');
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
            console.log(displayProduction);
            // production
            const production = document.createElement('a');
            production.target = '_blank';
            // href will be set in the conditional below
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
                const firstAirYear = displayProduction.year[0];
                // make call to get last air date
                const lastAirYear = await getLastAirYear(displayProduction.id);
                displayProduction.year = firstAirYear + '–' + lastAirYear;
                // this production is a tv show, so link the appropriate url
                production.href = `https://www.themoviedb.org/tv/${displayProduction.id}`;
            } else {
                // this production is a movie show, so link the appropriate url
                production.href = `https://www.themoviedb.org/movie/${displayProduction.id}`;
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

// collapses all info cards
function collapseInfoCards() {

    const infoCardBackgroundElements = document.getElementsByClassName('info-card-background');
    const infoCardContentElements = document.getElementsByClassName('info-card-content');

    for (const element of infoCardBackgroundElements) {
        element.classList.add('collapsed');
    }

    for (const element of infoCardContentElements) {
        element.classList.add('collapsed');
    }

}


// add box over face
function addFaceBox(faceBoxId, width, height, left, top) {
    const videoContainer = document.getElementsByClassName('watch-video')[0];
    const box = document.createElement('div');
    box.style.width = `${width * window.innerWidth}px`;
    box.style.height = `${height * window.innerHeight}px`;
    box.style.left = `${left * window.innerWidth}px`;
    box.style.top = `${top * window.innerHeight}px`;
    box.classList.add('face-box');
    box.id = faceBoxId;
    videoContainer.appendChild(box);
}


// Backtracker

// Wrapper function for placeCards
// Defines all required variables
function placeCardsWrapper(safeArea) {

    const constData = {

        'backdrop': safeArea,

        'gap': 20,
        'margin': 20,

        'infoCardWidth': 329,
        'infoCardHeight': 330,

        // define an object of the bounding rects of all faces
        'faceRects': getFaceRects()

    };

    console.log('constData:', constData);

    // define an array of the unplaced info cards
    const unplacedInfoCards = getUnplacedInfoCards();

    console.log('unplacedInfoCards:', unplacedInfoCards);

    // define an array of the placed info cards
    // initially no info cards are placed
    const placedInfoCards = [];

    // define an array mapping cards to placements
    // represents the best non-perfect placement
    //   -- (1) the most cards are placed and (2) and at better placements
    heuristicPlacements = [];

    const result = placeCards(constData, unplacedInfoCards, placedInfoCards, heuristicPlacements);

    if (result === null) {
        placeHeuristically(heuristicPlacements, unplacedInfoCards, placedInfoCards);
    }

}

// Backtracking function 
function placeCards(constData, unplacedInfoCards, placedInfoCards, heuristicPlacements) {

    // base case - all info cards have been placed
    if (unplacedInfoCards.length === 0) {
        return placedInfoCards;
    }

    // still cards to be placed

    const tryCard = unplacedInfoCards[unplacedInfoCards.length-1];
    // console.log('start', JSON.stringify(tryCard));

    // loop through the possible placements
    for (const placement of ['right', 'left', 'above', 'below']) {

        console.log(placement);

        // check if can place the card given the already placed cards
        if (canPlaceThisCard(tryCard, placement, placedInfoCards, constData)) {
            
            // if yes, place it
            placeThisCard(tryCard, placement, constData);
            placedInfoCards.push(tryCard);
            unplacedInfoCards.pop();

            // update heuristic placements
            if (placedInfoCards.length > heuristicPlacements.length) {
                // careful to never redefine the array to keep the reference
                heuristicPlacements.length = 0;
                // push a clone of placedInfoCards
                heuristicPlacements.push(...structuredClone(placedInfoCards));
            }

            console.log('placedInfoCards', JSON.stringify(placedInfoCards));
            console.log('heuristicPlacements', JSON.stringify(heuristicPlacements));
        
            // recursively try to solve from this state
            const solution = placeCards(constData, unplacedInfoCards, placedInfoCards, heuristicPlacements);

            if (solution != null) {
                // all cards are placed
                return solution;
            } 
            
            else {
                // did not lead to a solution - undo move
                placedInfoCards.pop();
                unplacedInfoCards.push(tryCard);
            }
        }
    }
    return null;
}





// Backtracker Helper Functions

// Returns an object of the face's id mapped to its bounding rect
function getFaceRects() {
    const faceRects = new Object;;
    for (const face of document.getElementsByClassName('face-box')) {
        faceRects[face.id] = face.getBoundingClientRect();
    }
    return faceRects;
}

// Returns an array of the info card's id mapped to its bounding rect
function getUnplacedInfoCards() {
    const unplacedInfoCards = [];
    for (const infoCardBackground of document.getElementsByClassName('info-card-background')) {
        baseId = infoCardBackground.id.slice(0, infoCardBackground.id.indexOf('-'));
        const infoCardObject = new Object;
        infoCardObject[baseId] = infoCardBackground.getBoundingClientRect();
        unplacedInfoCards.push(infoCardObject);
    }
    return unplacedInfoCards;
}

// Legality checker for the backtracking
function canPlaceThisCard(tryCard, placement, placedInfoCards, constData) {

    console.log('backdrop', constData.backdrop);
    
    // temporarily place tryCard
    placeThisCard(tryCard, placement, constData);
    // console.log('after placement, in check func', JSON.stringify(tryCard));

    const tryCardRect = tryCard[Object.keys(tryCard)[0]];
    // console.log('checker -- tryCardRect', tryCardRect);
        
    // does not intersect with faceRect
    for (const face in constData.faceRects) {
        const faceRect = constData.faceRects[face];
        if (tryCardRect.right + constData.gap > faceRect.left && faceRect.right + constData.gap > tryCardRect.left &&
            tryCardRect.bottom + constData.gap > faceRect.top && faceRect.bottom + constData.gap > tryCardRect.top) {
                // faceRect and tryCard intersect
                undoTempPlacement(tryCard);
                console.log('  undid temp placement');
                return false;
            }
    }

    // does not intersect with another infoCard
    for (const infoCard of placedInfoCards) {
        const infoCardRect = infoCard[Object.keys(infoCard)[0]];
        if (tryCardRect.right + constData.gap > infoCardRect.left && infoCardRect.right + constData.gap > tryCardRect.left &&
            tryCardRect.bottom + constData.gap > infoCardRect.top && infoCardRect.bottom + constData.gap > tryCardRect.top) {
                // infoCard and tryCard intersect
                undoTempPlacement(tryCard);
                console.log('  undid temp placement');
                return false;
            }
    }

    // does not go off the screen
    if (tryCardRect.left < constData.backdrop.left + constData.margin || tryCardRect.right + constData.margin > constData.backdrop.right ||
        tryCardRect.top < constData.backdrop.top + constData.margin || tryCardRect.bottom + constData.margin > constData.backdrop.bottom) {
            // tryCard goes off the screen
            undoTempPlacement(tryCard);
            console.log('  undid temp placement');
            return false;
        }
    
    // everything is legal
    undoTempPlacement(tryCard);
    console.log('  undid temp placement');
    return true;
}

// Gives tryCard an updated position according to the specified placement 
function placeThisCard(tryCard, placement, constData) {

    // match tryCard to faceRect
    const tryCardId = Object.keys(tryCard)[0];
    const faceId = tryCardId + '-faceBox';
    matchingFaceRect = constData.faceRects[faceId];

    // get tryCard background and content HTML elements
    tryCardBackground = document.getElementById(tryCardId + '-infoCardBackground');
    tryCardContent = document.getElementById(tryCardId + '-infoCardContent');

    switch (placement) {

        case 'right':
            tryCardBackground.style.left = `${matchingFaceRect.right + constData.gap}px`;
            tryCardBackground.style.top = `${matchingFaceRect.top}px`;
            tryCardContent.style.left = tryCardBackground.style.left;
            tryCardContent.style.top = tryCardBackground.style.top;
            console.log(`  placed ${tryCardId} ${placement} to ${faceId}`);
            break;
        
        case 'left':
            tryCardBackground.style.left = `${matchingFaceRect.left - constData.gap - constData.infoCardWidth}px`;
            tryCardBackground.style.top = `${matchingFaceRect.top}px`;
            tryCardContent.style.left = tryCardBackground.style.left;
            tryCardContent.style.top = tryCardBackground.style.top;
            console.log(`  placed ${tryCardId} ${placement} to ${faceId}`);
            break;
                
        case 'above':
            tryCardBackground.style.left = `${matchingFaceRect.left}px`;
            tryCardBackground.style.top = `${matchingFaceRect.top - constData.gap - constData.infoCardHeight}px`;
            tryCardContent.style.left = tryCardBackground.style.left;
            tryCardContent.style.top = tryCardBackground.style.top;
            console.log(`  placed ${tryCardId} ${placement} to ${faceId}`);
            break;
                
        case 'below':
            tryCardBackground.style.left = `${matchingFaceRect.left}px`;
            tryCardBackground.style.top = `${matchingFaceRect.bottom + constData.gap}px`;
            tryCardContent.style.left = tryCardBackground.style.left;
            tryCardContent.style.top = tryCardBackground.style.top;
            console.log(`  placed ${tryCardId} ${placement} to ${faceId}`);
            break;
            
    }

    // update tryCard with the new placement
    tryCard[tryCardId] = tryCardBackground.getBoundingClientRect();

}

// Undo temp info card placement by removing left and top style properties
function undoTempPlacement(tryCard) {

    // get tryCard as an HTML element
    const tryCardId = Object.keys(tryCard)[0];
    // get tryCard background and content HTML elements
    tryCardBackground = document.getElementById(tryCardId + '-infoCardBackground');
    tryCardContent = document.getElementById(tryCardId + '-infoCardContent');
    tryCardBackground.style.removeProperty('left');
    tryCardBackground.style.removeProperty('top');
    tryCardContent.style.removeProperty('left');
    tryCardContent.style.removeProperty('top');

}

// Place the cards in heuristicPlacements
function placeHeuristically(heuristicPlacements, unplacedInfoCards, placedInfoCards) {

    // loop through the array
    for (const card of heuristicPlacements) {

        console.log('card in heuristic:', card);

        // get card id
        const cardId = Object.keys(card)[0]

        // get card background and content as HTML elements
        cardBackground = document.getElementById(cardId + '-infoCardBackground');
        cardContent = document.getElementById(cardId + '-infoCardContent');

        // place card
        cardBackground.style.left = `${card[cardId].left}px`;
        cardBackground.style.top = `${card[cardId].top}px`;
        cardContent.style.left = cardBackground.style.left;
        cardContent.style.top = cardBackground.style.top;

        // update placed and unplaced infoCards
        placedInfoCards.push(card);
        unplacedInfoCards.pop();

        // hide any cards that have not been placed
        for (const unplacedCard of unplacedInfoCards) {

            const unplacedCardId = Object.keys(unplacedCard)[0]

            // get card background and content as HTML elements
            unplacedCardBackground = document.getElementById(unplacedCardId + '-infoCardBackground');
            unplacedCardContent = document.getElementById(unplacedCardId + '-infoCardContent');

            // hide
            unplacedCardBackground.style.display = 'none';
            unplacedCardContent.style.display = 'none';

        }

    }

    console.log('placed heuristically');

}

