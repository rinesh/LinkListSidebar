document.addEventListener('DOMContentLoaded', function() {
  let allLinks = [];
  let activeTabId;

  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    const tab = tabs[0];
    activeTabId = tab.id;
    const url = new URL(tab.url);
    if (url.protocol === 'chrome:') {
      displayError('Cannot access links on this page.');
      return;
    }

    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        function: getLinks
      },
      (results) => {
        if (results && results[0].result) {
          allLinks = results[0].result;
          displayLinks(allLinks);

          document.getElementById('filter').addEventListener('change', function() {
            const filter = this.value;
            const search = document.getElementById('search').value.toLowerCase();
            displayLinks(filterLinks(allLinks, filter, search));
          });

          document.getElementById('search').addEventListener('input', function() {
            const search = this.value.toLowerCase();
            const filter = document.getElementById('filter').value;
            displayLinks(filterLinks(allLinks, filter, search));
          });

          document.getElementById('copy-links').addEventListener('click', function() {
            copyLinks(allLinks);
          });

          document.getElementById('open-links').addEventListener('click', function() {
            openLinks(allLinks);
          });
        }
      }
    );
  });

  function getLinks() {
    const links = Array.from(document.querySelectorAll('a')).map(a => ({
      href: a.href,
      text: a.innerText
    }));
    return links;
  }

  function displayLinks(links) {
    const linkList = document.getElementById('link-list');
    linkList.innerHTML = '';
    links.forEach(link => {
      const listItem = document.createElement('li');
      const anchor = document.createElement('a');
      anchor.href = link.href;
      anchor.textContent = link.text || link.href;
      anchor.target = '_blank';
      listItem.appendChild(anchor);
      listItem.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.scripting.executeScript({
          target: { tabId: activeTabId },
          function: highlightAndOpenLink,
          args: [link.href]
        }, () => {
          window.close(); // Close the popup after injecting the script
        });
      });
      linkList.appendChild(listItem);
    });
  }

  function filterLinks(links, filter, search) {
    return links.filter(link => {
      const matchesFilter = filter === 'all' || 
                            (filter === 'internal' && link.href.startsWith(location.origin)) || 
                            (filter === 'external' && !link.href.startsWith(location.origin));
      const matchesSearch = link.text.toLowerCase().includes(search) || link.href.toLowerCase().includes(search);
      return matchesFilter && matchesSearch;
    });
  }

  function copyLinks(links) {
    const text = links.map(link => link.href).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      alert('Links copied to clipboard!');
    }, () => {
      alert('Failed to copy links.');
    });
  }

  function openLinks(links) {
    if (confirm(`Are you sure you want to open ${links.length} links?`)) {
      links.forEach(link => {
        chrome.tabs.create({ url: link.href, active: false });
      });
    }
  }

  function displayError(message) {
    const linkList = document.getElementById('link-list');
    linkList.innerHTML = `<li>${message}</li>`;
  }
});

function highlightAndOpenLink(href) {
  const link = Array.from(document.querySelectorAll('a')).find(a => a.href === href);
  if (link) {
    link.scrollIntoView({ behavior: 'smooth', block: 'center' });
    let borderVisible = true;
    const blinkInterval = setInterval(() => {
      link.style.border = borderVisible ? '2px solid red' : '';
      borderVisible = !borderVisible;
    }, 500);
    setTimeout(() => {
      clearInterval(blinkInterval);
      link.style.border = '';
      window.open(href, '_blank');
    }, 3000);
  }
}
