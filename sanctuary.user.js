// ==UserScript==
// @name         Sanctuary Connector
// @version      0.1
// @match        *://*.moomoo.io/*
// @match        *://moomoo.io/*
// @grant        none
// ==/UserScript==

(function() {
    let ws = window.WebSocket;
    class Sanctuary extends ws {
        constructor(){
            super('ws://localhost:3000/moomoo');
        }
    }
    window.WebSocket = Sanctuary;

    // prevent server full messages
    Object.defineProperty(window, 'vultr', {
        value: {
            "scheme": "mm_prod",
            "servers": [{
                "ip": "_",
                "scheme": "mm_prod",
                "region": "vultr:12",
                "index": 0,
                "games": [{
                    "playerCount": 0,
                    "isPrivate": false
                }]
            }]
        },
        writable: false
    });

    let open = XMLHttpRequest.prototype.open;

    XMLHttpRequest.prototype.open = function(method) {
        let url = arguments[1];

        if (url) {
            if (url.endsWith("/serverData")) {
                return open.apply(this, ['GET', 'data:application/json;base64,eyJzY2hlbWUiOiJtbV9wcm9kIiwic2VydmVycyI6W3siaXAiOiJfIiwic2NoZW1lIjoibW1fcHJvZCIsInJlZ2lvbiI6InZ1bHRyOjEyIiwiaW5kZXgiOjAsImdhbWVzIjpbeyJwbGF5ZXJDb3VudCI6MCwiaXNQcml2YXRlIjpmYWxzZX1dfV19Cg==']);
            }
        }

        return open.apply(this, arguments);
    };

    if (window.location.href.includes("?server=") && !window.location.href.includes("?server=12:0:0")) {
        window.location = "//" + window.location.host;
    }
})();
