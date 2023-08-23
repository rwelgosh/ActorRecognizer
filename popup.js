const btn = document.querySelector("button");

btn.addEventListener("click", function() {

    btn.classList.add('loading');
    btn.innerHTML = '<div class="loader"></div>Loading'

    chrome.runtime.sendMessage({status: "get data"}, (response) => {
        if (response.message === "WORKED") {
            (async () => {
                let blob = await fetch(response.data).then(r => r.blob());
                
                AnonLog()

                new Response(blob).arrayBuffer().then((v) => {
                    var ret = recognize_celebrities(v);
                    ret.then((v) => {
                        if (v != "ERROR") {
                            chrome.tabs.query({active: true, lastFocusedWindow: true}, (tabs) => {
                                chrome.tabs.sendMessage(tabs[0].id, {status: "actor data", data: v}, (response) => {
                                    if (response.paused === true) {
                                        // success
                                        window.close(); // close popup
                                    } else {

                                    }
                                    // console.log(response.message);
                                });
                            });
                        }
                    })
                });
            })();
        }
    });
});      

function recognize_celebrities(image) {
    AWS.region = "us-east-2";
    var rekognition = new AWS.Rekognition();
    var params = {
        Image: { /* required */
            Bytes: image
        }
    };
    var data_promise = new Promise(function(resolve, reject) {
        rekognition.recognizeCelebrities(params, function(err, data) {
            if (err) {
                console.log(err, err.stack);
                return "ERROR";
            } // an error occurred
            else {
                // console.log(data);
                resolve(data)
            }
        });
    });
    return data_promise;
}

//Provides anonymous log on to AWS services
function AnonLog() {

// Initialize the Amazon Cognito credentials provider
AWS.config.region = 'us-east-2'; // Region
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: 'us-east-2:10a8729f-c596-4908-a749-25ffffcb0cee',
});
// Make the call to obtain credentials
AWS.config.credentials.get(function () {
    // Credentials will be available when this function is called.
    var accessKeyId = AWS.config.credentials.accessKeyId;
    var secretAccessKey = AWS.config.credentials.secretAccessKey;
    var sessionToken = AWS.config.credentials.sessionToken;
});
}