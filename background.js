chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ enabled: false });
  
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
  
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.active) {
      // When the tab is updated, load the vPos, fSize, and fColor
      // Excecute script.js

      // TODO
      // When the tab is updated check to see if they want to do the thing
      // If it is, run script.js
      chrome.storage.local.get(["enabled"], data => {
        chrome.tabs.executeScript(
          tabId,
          {
            file: "script.js"
          },
          () => {
            const error = chrome.runtime.lastError;
            if (error) "Error. Tab ID: " + tab.id + ": " + JSON.stringify(error);
  
            chrome.tabs.sendMessage(tabId, {
              vPos: data.vPos,
              fSize: data.fSize,
              fColor: data.fColor
            });
          }
        );
      });
    }
  });