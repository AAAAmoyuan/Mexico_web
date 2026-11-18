/* Robin landing page: loads CMS-managed copy from content/site.json and patches the page.
   If the file is missing or invalid, the copy already written in index.html stays visible.
   Mapping rules:
     data-cms="a.b.c"                  -> element textContent = value
     data-cms + data-cms-html          -> innerHTML = escaped value, newlines become <br>
     data-cms-attr="href:a.link"       -> set attribute(s), comma separated
     data-cms-list="a.bullets"         -> rebuild <li> list (one item per line)
     data-cms-tel="a.phone"            -> textContent = number, href = tel:digits
     data-cms-chat="a.bubbles"         -> rebuild <p class="bubble them|me">
*/
(function () {
  "use strict";

  var SRC = "content/site.json";

  function get(obj, path) {
    return path.split(".").reduce(function (acc, key) {
      if (acc === null || acc === undefined) return undefined;
      return acc[key];
    }, obj);
  }

  function escapeHtml(value) {
    return value.replace(/[&<>"]/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch];
    });
  }

  /* A list widget may store plain strings or single-field objects. */
  function asText(item) {
    if (typeof item === "string") return item;
    if (item && typeof item === "object") {
      var keys = Object.keys(item);
      return keys.length ? String(item[keys[0]]) : "";
    }
    return "";
  }

  function apply(data) {
    Array.prototype.forEach.call(document.querySelectorAll("[data-cms]"), function (el) {
      var value = get(data, el.getAttribute("data-cms"));
      if (typeof value !== "string") return;
      if (el.hasAttribute("data-cms-html")) {
        el.innerHTML = escapeHtml(value).replace(/\n/g, "<br />");
      } else {
        el.textContent = value;
      }
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-cms-attr]"), function (el) {
      el.getAttribute("data-cms-attr").split(",").forEach(function (pair) {
        var bits = pair.split(":");
        var attr = (bits[0] || "").trim();
        var path = (bits[1] || "").trim();
        if (!attr || !path) return;
        var value = get(data, path);
        if (typeof value === "string" && value) el.setAttribute(attr, value);
      });
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-cms-list]"), function (el) {
      var list = get(data, el.getAttribute("data-cms-list"));
      /* Editors type one item per line, so a plain string is the normal case. */
      if (typeof list === "string") {
        list = list.split(/\r?\n/);
      }
      if (!Array.isArray(list) || !list.length) return;
      var tag = el.getAttribute("data-cms-list-tag") || "li";
      el.textContent = "";
      list.forEach(function (item) {
        var text = asText(item).trim();
        if (!text) return;
        var child = document.createElement(tag);
        child.textContent = text;
        el.appendChild(child);
      });
    });

    /* 电话号码：正文元素显示号码，链接元素只更新 tel: 地址（保留按钮文字） */
    Array.prototype.forEach.call(document.querySelectorAll("[data-cms-tel]"), function (el) {
      var value = get(data, el.getAttribute("data-cms-tel"));
      if (typeof value !== "string" || !value) return;
      if (el.tagName === "A") {
        el.setAttribute("href", "tel:" + value.replace(/[^0-9+]/g, ""));
      } else {
        el.textContent = value;
      }
    });

    /* 聊天气泡：格式 [{ from: "them" | "me", text: "..." }] */
    Array.prototype.forEach.call(document.querySelectorAll("[data-cms-chat]"), function (el) {
      var list = get(data, el.getAttribute("data-cms-chat"));
      if (!Array.isArray(list) || !list.length) return;
      el.textContent = "";
      list.forEach(function (item) {
        var text = typeof item === "string" ? item : (item && item.text) || "";
        if (!text) return;
        var bubble = document.createElement("p");
        bubble.className = "bubble " + (item && item.from === "me" ? "me" : "them");
        bubble.textContent = text;
        el.appendChild(bubble);
      });
    });

    document.documentElement.setAttribute("data-cms-loaded", "true");
  }

  fetch(SRC, { cache: "no-cache" })
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(apply)
    .catch(function (err) {
      if (window.console && console.warn) {
        console.warn("[content] No se pudo cargar " + SRC + " (" + err.message + "), se usa el texto por defecto.");
      }
    });
})();
