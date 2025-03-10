// ==UserScript==
// @name         AtCoder AC Problem Highlighter
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  AtCoderの問題一覧で、ACになった問題に「✅」を表示する
// @author       You
// @match        https://atcoder.jp/contests/*/tasks
// @match        https://atcoder.jp/contests/*/submissions/me*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      atcoder.jp
// ==/UserScript==

(function () {
  'use strict';

  let solvedProblems = new Set();
  const contestId = window.location.pathname.split("/")[2]; // コンテストID

  // 提出ページの全ページからACの問題を取得
  async function fetchAllSolvedProblems(page = 1) {
    const url = `https://atcoder.jp/contests/${contestId}/submissions/me?page=${page}`;
    try {
      const response = await fetch(url, { credentials: "include" });
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      // 提出テーブルのACを取得
      doc.querySelectorAll("table tbody tr").forEach(row => {
        const taskLink = row.querySelector("td a[href^='/contests/']");
        const statusCell = row.querySelector("td.text-center .label-success"); // AC ラベル

        if (taskLink && statusCell) {
          const taskUrl = taskLink.getAttribute("href");
          solvedProblems.add(taskUrl);
        }
      });

      // 次のページがある場合は再帰的に取得
      const nextPageLink = doc.querySelector("ul.pager li a[href*='?page=']");
      if (nextPageLink && !nextPageLink.closest("li").classList.contains("disabled")) {
        const nextPageNumber = parseInt(new URL(nextPageLink.href).searchParams.get("page"), 10);
        if (!isNaN(nextPageNumber)) {
          await fetchAllSolvedProblems(nextPageNumber);
        }
      }
    } catch (error) {
      console.error("Failed to fetch AC problems:", error);
    }
  }

  // 問題一覧ページで、ACの問題に「✅」を追加
  function highlightSolvedProblems() {
    document.querySelectorAll("table tbody tr td:first-child a[href^='/contests/']").forEach(a => {
      const taskUrl = a.getAttribute("href");
      if (solvedProblems.has(taskUrl) && !a.classList.contains("solved-highlight")) {
        a.classList.add("solved-highlight");
        const badge = document.createElement("span");
        badge.textContent = "✅ ";
        a.prepend(badge);
      }
    });
  }

  // CSS を追加
  GM_addStyle(`
      .solved-highlight {}
  `);

  // **提出ページでACの問題を取得**
  if (window.location.pathname.includes("/submissions/me")) {
    fetchAllSolvedProblems().then(() => {
      console.log("[Tampermonkey] Solved AC problems:", solvedProblems);
    });
  }

  // **問題一覧ページでACの問題をハイライト**
  if (window.location.pathname.includes("/tasks")) {
    fetchAllSolvedProblems().then(() => {
      highlightSolvedProblems();
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
    });
  }
})();
