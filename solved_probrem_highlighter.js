// ==UserScript==
// @name         AtCoder Solved Problem Highlighter (All Contests)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  AtCoderの問題一覧で正解済みの問題に「✅ 」を表示する (全コンテスト対応)
// @author       lirlia
// @match        https://atcoder.jp/contests/*/tasks
// @match        https://atcoder.jp/contests/*/score
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      atcoder.jp
// ==/UserScript==

(function () {
  'use strict';

  let solvedProblems = new Set();  // 正解済みの問題を格納するセット
  const contestId = window.location.pathname.split("/")[2]; // 現在のコンテストID

  // 正解済みの問題一覧を取得
  function fetchSolvedProblems() {
    fetch(`https://atcoder.jp/contests/${contestId}/score`, { credentials: "include" })
      .then(response => response.text())
      .then(html => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        // スコアページから正解済みの問題を取得
        doc.querySelectorAll("td.text-center a[href^='/contests/']").forEach(a => {
          const taskUrl = a.getAttribute("href");
          solvedProblems.add(taskUrl);
        });

        console.log("[Tampermonkey] Solved problems:", solvedProblems);
        highlightSolvedProblems();
      })
      .catch(error => console.error("Failed to fetch solved problems:", error));
  }

  // 問題一覧ページで、正解済みの問題に「✅ 」を追加
  function highlightSolvedProblems() {
    document.querySelectorAll("table tbody tr td:first-child a[href^='/contests/']").forEach(a => {
      const taskUrl = a.getAttribute("href");
      if (solvedProblems.has(taskUrl) && !a.classList.contains("solved-highlight")) {
        a.classList.add("solved-highlight");
        const badge = document.createElement("span");
        badge.textContent = "✅ ";
        badge.style.color = "red";
        badge.style.fontWeight = "bold";
        a.prepend(badge);
      }
    });
  }

  // CSS を追加
  GM_addStyle(`
      .solved-highlight {
          font-weight: bold;
      }
  `);

  // **スコアページで正解済みの問題を取得**
  if (window.location.pathname.includes("/score")) {
    fetchSolvedProblems();
  }

  // **問題一覧ページで正解済みの問題をハイライト**
  if (window.location.pathname.includes("/tasks")) {
    fetchSolvedProblems(); // 初回取得
    setTimeout(highlightSolvedProblems, 2000); // 遅延実行で対策

    // **MutationObserverでDOMの変更を監視**
    const observer = new MutationObserver(highlightSolvedProblems);
    observer.observe(document.body, { childList: true, subtree: true });

    // **SPA対策: pushStateをフック**
    (function (history) {
      const pushState = history.pushState;
      history.pushState = function () {
        setTimeout(highlightSolvedProblems, 1000);
        return pushState.apply(history, arguments);
      };
    })(window.history);
  }
})();
