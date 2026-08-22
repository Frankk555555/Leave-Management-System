// ============================================
// SSE (Server-Sent Events) Service
// ============================================
// Manages real-time unidirectional event streams
// for in-app notifications and live updates.
// ============================================

class SSEService {
  constructor() {
    // Map<userId, Set<res>> - Supports multiple tabs/devices per user
    this.clients = new Map();
    this.heartbeatIntervalMs = 25000; // 25s ping
  }

  /**
   * Register a new client SSE connection
   * @param {number|string} userId
   * @param {import('express').Response} res
   * @param {import('express').Request} req
   */
  addClient(userId, res, req) {
    const uid = Number(userId) || String(userId);

    // 1. Set SSE HTTP Headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable Nginx proxy buffering
      "Access-Control-Allow-Origin": "*",
    });

    if (typeof res.flushHeaders === "function") {
      res.flushHeaders();
    }

    // 2. Add to client pool
    if (!this.clients.has(uid)) {
      this.clients.set(uid, new Set());
    }
    const userConnections = this.clients.get(uid);
    userConnections.add(res);

    // 3. Send initial connected event
    this._writeEvent(res, "connected", {
      status: "connected",
      userId: uid,
      timestamp: new Date().toISOString(),
    });

    // 4. Setup heartbeat ping to keep connection open across firewalls/proxies
    const heartbeatTimer = setInterval(() => {
      try {
        res.write(":keep-alive\n\n");
      } catch (err) {
        clearInterval(heartbeatTimer);
      }
    }, this.heartbeatIntervalMs);

    // 5. Cleanup on connection close
    const cleanup = () => {
      clearInterval(heartbeatTimer);
      if (this.clients.has(uid)) {
        const set = this.clients.get(uid);
        set.delete(res);
        if (set.size === 0) {
          this.clients.delete(uid);
        }
      }
    };

    req.on("close", cleanup);
    res.on("close", cleanup);
    res.on("error", cleanup);
  }

  /**
   * Send a typed SSE event to a specific user
   * @param {number|string} userId
   * @param {string} event
   * @param {any} data
   */
  sendToUser(userId, event = "notification", data = {}) {
    const uid = Number(userId) || String(userId);
    const userConnections = this.clients.get(uid);

    if (!userConnections || userConnections.size === 0) {
      return false;
    }

    const staleConnections = [];

    for (const res of userConnections) {
      try {
        this._writeEvent(res, event, data);
      } catch (err) {
        staleConnections.push(res);
      }
    }

    // Clean up any failed connections
    for (const staleRes of staleConnections) {
      userConnections.delete(staleRes);
    }
    if (userConnections.size === 0) {
      this.clients.delete(uid);
    }

    return true;
  }

  /**
   * Send a typed SSE event to multiple users
   * @param {Array<number|string>} userIds
   * @param {string} event
   * @param {any} data
   */
  sendToUsers(userIds, event = "notification", data = {}) {
    if (!Array.isArray(userIds)) return;
    for (const uid of userIds) {
      this.sendToUser(uid, event, data);
    }
  }

  /**
   * Broadcast an event to all currently connected clients
   * @param {string} event
   * @param {any} data
   */
  broadcast(event = "announcement", data = {}) {
    for (const [userId] of this.clients) {
      this.sendToUser(userId, event, data);
    }
  }

  /**
   * Get total number of active connections
   * @returns {number}
   */
  getClientCount() {
    let total = 0;
    for (const set of this.clients.values()) {
      total += set.size;
    }
    return total;
  }

  /**
   * Helper to write formatted SSE event
   * @private
   */
  _writeEvent(res, event, data) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}

// Singleton instance
const sseService = new SSEService();

module.exports = sseService;
