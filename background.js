const delay = 5000;

function abbreviatedUrl(tab) {
  return tab.url.length > 30 ? tab.url.match(/^.{15}|.{15}$/g).join('...') : tab.url;
}

function compareUrls(left, right) {
  return left.replace(/#.*$/, "") == right.replace(/#.*$/, "");
}

/*
  https://developer.chrome.com/extensions/tabs#method-query
*/

function removeDuplicates(tab, duplicates) {
  var tab_or_tabs = duplicates.length > 1 ? "tabs" : "tab",
    title = "Found " + duplicates.length + " duplicate " + tab_or_tabs + ".",
    message = "" + duplicates.length + " " + tab_or_tabs + " containing " + abbreviatedUrl(tab) + " will be closed.",
    options = {
      type: 'basic',
      iconUrl: 'icon48.png',
      title: title,
      message: message,
      isClickable: true,
      buttons: [{ title: 'Cancel' }]
    },
    notificationId = null,
    removeTabs = () => {
      chrome.tabs.get(tab.id, (t) => {
        // only close tabs if triggering tab still open
        if (typeof t == 'undefined') return null;

        // remove individual tabs because passing array that includes closed tabs fails silently
        duplicates.forEach((duplicate) => {
          if (typeof duplicate == 'undefined') return;
          chrome.tabs.remove(duplicate.id);
        });
      });
      chrome.notifications.clear(notificationId, function () { });
    },
    removeTabsTimer = window.setTimeout(removeTabs.bind(this), delay);

  chrome.notifications.create('', options, function (nId) {
    notificationId = nId;
  });

  chrome.notifications.onButtonClicked.addListener((nId, buttonIndex) => {
    if (nId != notificationId) return;
    window.clearTimeout(removeTabsTimer);
    chrome.notifications.clear(notificationId, function () { });
    return false;
  });
}

chrome.browserAction.onClicked.addListener((details) => {
  if (details.id && details.url && details.url != '' && !details.url.match(/^chrome:\/\//)) {
    chrome.tabs.get(details.id, (tab) => {
      if (typeof tab == 'undefined') return null;
      if (tab.url.match(/^view-source:/)) return null;
      chrome.tabs.query({ currentWindow: true, pinned: false }, (tabs) => {
        var duplicates = tabs.filter((t) => {
          return compareUrls(t.url, details.url) && t.id != tab.id && !t.pinned && t.status == 'complete';
        });
        if (duplicates.length) {
          removeDuplicates(tab, duplicates);
        }
      });
    });
  }
});

//chrome.webNavigation.onCompleted.addListener(onCompleted);
