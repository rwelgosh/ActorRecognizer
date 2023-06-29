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

chrome.tabs.onUpdated.addListener((tabID, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.active) {
        console.log("working");
        chrome.scripting.executeScript(
            {
                target: {tabId : tab.id},
                files: ["script.js"]
            }
        );
    }
});

// chrome.action.onClicked.addListener((tab) => {
//     console.log("Ok you clicked but its not executing");
//     chrome.scripting.executeScript({
//       target: {tabId: tab.id},
//       files: ['script.js']
//     });
//   });
