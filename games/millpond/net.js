// Millpond – connecting the party with PeerJS (see docs/PARTY-GAMES.md).
// The host opens a room under a fixed id made from the party code; guests
// connect to exactly that id. Game data then flows directly between players.

const PEER_PREFIX = 'nss-millpond-';
// A closed tab is not always noticed by the browser on the other side. So
// both sides send a small "ping" every 2 seconds; 9 seconds of silence
// counts as "gone".
const PING_MS = 2000;
const SILENCE_MS = 9000;
// A guest who reloads can be back before the host noticed that the old
// connection is gone. The host then says "full" for a moment, so the guest
// asks again a few times (longer than SILENCE_MS in total) before giving up.
const FULL_TRIES = 8;

/** The guest's current connection; used to say goodbye when the tab closes. */
let liveConn = null;
window.addEventListener('pagehide', () => {
  if (liveConn && liveConn.open) liveConn.send({ t: 'bye' });
});

let peerLib = null;
/** PeerJS is shipped with the game (vendor/), nothing is loaded from other sites. */
function loadPeerLib() {
  if (window.Peer) return Promise.resolve();
  if (!peerLib) {
    peerLib = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'vendor/peerjs.min.js';
      script.onload = () => resolve();
      script.onerror = () => {
        peerLib = null;
        reject(new Error('PeerJS could not be loaded'));
      };
      document.head.appendChild(script);
    });
  }
  return peerLib;
}

/**
 * Host side. Calls onJoin(connection) for every guest; it must return
 * { onMessage(msg), onLeave() }. onStatus(text) reports problems.
 */
export async function openRoom(code, { onJoin, onStatus }, tries = 0) {
  try {
    await loadPeerLib();
  } catch {
    onStatus('Multiplayer service not reachable. Check your internet connection.');
    return;
  }
  const peer = new window.Peer(PEER_PREFIX + code, { debug: 0 });
  peer.on('open', () => onStatus(''));
  peer.on('connection', (conn) => {
    let guest = null;
    let lastHeard = Date.now();
    let pinger = 0;
    const leave = () => {
      clearInterval(pinger);
      if (guest) guest.onLeave();
      guest = null;
    };
    conn.on('open', () => {
      guest = onJoin({
        send: (msg) => {
          if (conn.open) conn.send(msg);
        },
        close: () => setTimeout(() => conn.close(), 300),
      });
      pinger = setInterval(() => {
        if (Date.now() - lastHeard > SILENCE_MS) {
          leave();
          conn.close();
        } else if (conn.open) {
          conn.send({ t: 'ping' });
        }
      }, PING_MS);
    });
    conn.on('data', (msg) => {
      lastHeard = Date.now();
      if (!msg || msg.t === 'ping') return;
      if (msg.t === 'bye') leave();
      else if (guest) guest.onMessage(msg);
    });
    conn.on('close', leave);
    conn.on('error', leave);
  });
  peer.on('disconnected', () => {
    if (!peer.destroyed) peer.reconnect();
  });
  peer.on('error', (err) => {
    // Room id taken: usually our own old connection after a reload. It is
    // released after a few seconds, so try the same id again.
    if (err.type === 'unavailable-id' && tries < 10) {
      peer.destroy();
      onStatus('Preparing the party room…');
      setTimeout(() => openRoom(code, { onJoin, onStatus }, tries + 1), 3000);
    } else if (['network', 'server-error', 'socket-error'].includes(err.type)) {
      onStatus('Lost the connection to the multiplayer service.');
    }
  });
}

/**
 * Guest side. onOpen(send) is called once connected, onMessage(msg) for every
 * message from the host. If the host is not there (yet) or goes away, it
 * keeps trying, because guests often load faster than the host.
 */
export async function joinRoom(code, handlers, tries = 0, fullTries = 0) {
  const { onOpen, onMessage, onStatus } = handlers;
  try {
    await loadPeerLib();
  } catch {
    onStatus('Multiplayer service not reachable. Check your internet connection.');
    return;
  }
  const peer = new window.Peer({ debug: 0 });
  let retried = false;
  let pinger = 0;
  const retry = (text, nextTries, nextFullTries = 0) => {
    if (retried) return;
    retried = true;
    clearInterval(pinger);
    peer.destroy();
    onStatus(text);
    setTimeout(() => joinRoom(code, handlers, nextTries, nextFullTries), 1500);
  };
  peer.on('open', () => {
    const conn = peer.connect(PEER_PREFIX + code, { reliable: true });
    let lastHeard = Date.now();
    conn.on('open', () => {
      liveConn = conn;
      lastHeard = Date.now();
      onStatus('');
      onOpen((msg) => {
        if (conn.open) conn.send(msg);
      });
      pinger = setInterval(() => {
        if (Date.now() - lastHeard > SILENCE_MS) retry('Connection lost. Reconnecting…', 0);
        else if (conn.open) conn.send({ t: 'ping' });
      }, PING_MS);
    });
    conn.on('data', (msg) => {
      lastHeard = Date.now();
      if (!msg || msg.t === 'ping') return;
      if (msg.t === 'full' && fullTries < FULL_TRIES) {
        retry('Waiting for a free seat…', 0, fullTries + 1);
        return;
      }
      if (msg.t === 'full') {
        // The game really has both its players: do not keep knocking.
        retried = true;
        clearInterval(pinger);
        peer.destroy();
        onStatus('This game already has two players.');
        return;
      }
      onMessage(msg);
    });
    conn.on('close', () => retry('The host left. Waiting for the host…', 0));
    conn.on('error', () => retry('Connection lost. Reconnecting…', 0));
  });
  peer.on('error', (err) => {
    if (err.type === 'peer-unavailable' && tries < 60) {
      retry('Waiting for the host…', tries + 1);
    } else if (err.type === 'peer-unavailable') {
      onStatus('Could not find the host. Ask them to start the game again.');
    } else if (['network', 'server-error', 'socket-error'].includes(err.type)) {
      retry('Multiplayer service not reachable. Trying again…', tries + 1);
    }
  });
}
