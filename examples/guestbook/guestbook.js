(function () {
  var BASE = "https://formzero.anoraktrend.workers.dev/api/forms/inform-us-of-the-lights-you-hear";
  var log = document.querySelector(".guestbook-log");
  var form = document.querySelector(".guestbook-form");
  var status = document.querySelector(".guestbook-status");

  // Neocities' strict CSP blocks fetch() and cross-origin form posts, so we
  // talk to FormZero via JSONP: load a <script> that calls a global callback.
  // (script-src * is allowed, connect-src/form-action are not.)
  function jsonp(path, params, onData) {
    var cbName = "gb" + Math.random().toString(36).slice(2);
    window[cbName] = function (data) {
      delete window[cbName];
      if (script.parentNode) script.parentNode.removeChild(script);
      onData(data);
    };
    params.callback = cbName;
    var qs = Object.keys(params)
      .map(function (k) {
        return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]);
      })
      .join("&");
    var script = document.createElement("script");
    script.src = BASE + path + "?" + qs;
    script.onerror = function () {
      delete window[cbName];
      if (script.parentNode) script.parentNode.removeChild(script);
      onData(null);
    };
    document.body.appendChild(script);
  }

  function fmtDate(ts) {
    var d = new Date(ts);
    var p = function (n) { return (n < 10 ? "0" : "") + n; };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
           " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }

  function entryEl(e) {
    var data = e.data || {};
    var wrap = document.createElement("div");
    wrap.className = "guestbook-entry";

    var user = document.createElement("span");
    user.className = "entry-user";
    user.textContent = data.name || "anonymous";

    var date = document.createElement("span");
    date.className = "entry-date";
    date.textContent = fmtDate(e.created_at);

    var text = document.createElement("p");
    text.className = "entry-text";
    text.textContent = data.message || "";

    wrap.appendChild(user);
    wrap.appendChild(date);
    wrap.appendChild(text);
    return wrap;
  }

  function setStatus(msg) {
    if (status) status.textContent = msg || "";
  }

  function loadEntries() {
    if (!log) return;
    jsonp("/guestbook", {}, function (res) {
      // Keep the static retro entries if there's nothing yet or on error.
      if (!res || !res.entries || !res.entries.length) return;
      log.innerHTML = "";
      res.entries.forEach(function (e) { log.appendChild(entryEl(e)); });
    });
  }

  if (form) {
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var fd = new FormData(form);
      setStatus("signing...");
      jsonp("/guestbook/sign", {
        name: (fd.get("name") || "").toString().slice(0, 100),
        email: (fd.get("email") || "").toString().slice(0, 200),
        message: (fd.get("message") || "").toString().slice(0, 2000),
        website: (fd.get("website") || "").toString()
      }, function (res) {
        if (res && res.ok) {
          form.reset();
          setStatus("thanks for signing!");
          loadEntries();
        } else {
          setStatus("could not sign right now, try again.");
        }
      });
    });
  }

  loadEntries();
})();
