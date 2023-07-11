chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ enabled: true });
  
    chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
      chrome.declarativeContent.onPageChanged.addRules([
        {
          conditions: [
            new chrome.declarativeContent.PageStateMatcher({
              pageUrl: { hostSuffix: "netflix.com" }
            })
          ],
          actions: [new chrome.declarativeContent.ShowPageAction()]
        }
      ]);
    });
});

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
      if( request.status === "get data" ) {
          console.log("getting data");
          chrome.tabs.captureVisibleTab(
              null,
              {},
              function(dataUrl)
              {
                  sendResponse({message: "WORKED", data: dataUrl})
              }
          );
          return true;
      }
  }
);
