// Teleport Snipe – a clock that keeps running in a hidden tab.
// Browsers slow timers of hidden tabs down to about one per second. The
// referee (host.js) must keep its pace even when the host looks at another
// tab, so this small worker sends a "tick" 30 times per second; workers are
// not slowed down like that.
setInterval(() => postMessage(0), 1000 / 30);
