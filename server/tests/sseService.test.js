const sseService = require("../services/sseService");
const EventEmitter = require("events");

describe("SSEService (Server-Sent Events)", () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    // Clear all active clients
    sseService.clients.clear();

    mockReq = new EventEmitter();
    mockRes = {
      writeHead: jest.fn(),
      flushHeaders: jest.fn(),
      write: jest.fn(),
      on: jest.fn(),
    };
  });

  it("should correctly register a client and set SSE headers", () => {
    sseService.addClient(101, mockRes, mockReq);

    expect(mockRes.writeHead).toHaveBeenCalledWith(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": "*",
    });
    expect(mockRes.flushHeaders).toHaveBeenCalled();
    expect(sseService.getClientCount()).toBe(1);

    // Verify initial connected message
    expect(mockRes.write).toHaveBeenCalledWith(
      expect.stringContaining("event: connected\n")
    );
  });

  it("should send event to a specific user", () => {
    sseService.addClient(101, mockRes, mockReq);

    const payload = {
      title: "ใบลาได้รับการอนุมัติ",
      message: "หัวหน้าสาขาอนุมัติใบลาของคุณแล้ว",
    };

    const sent = sseService.sendToUser(101, "notification", payload);
    expect(sent).toBe(true);

    expect(mockRes.write).toHaveBeenCalledWith("event: notification\n");
    expect(mockRes.write).toHaveBeenCalledWith(
      `data: ${JSON.stringify(payload)}\n\n`
    );
  });

  it("should return false when sending to an offline/unconnected user", () => {
    const sent = sseService.sendToUser(999, "notification", { test: true });
    expect(sent).toBe(false);
  });

  it("should send event to multiple users", () => {
    const mockRes2 = {
      writeHead: jest.fn(),
      flushHeaders: jest.fn(),
      write: jest.fn(),
      on: jest.fn(),
    };
    const mockReq2 = new EventEmitter();

    sseService.addClient(101, mockRes, mockReq);
    sseService.addClient(102, mockRes2, mockReq2);

    const payload = { title: "ประกาศระบบ" };
    sseService.sendToUsers([101, 102], "announcement", payload);

    expect(mockRes.write).toHaveBeenCalledWith("event: announcement\n");
    expect(mockRes2.write).toHaveBeenCalledWith("event: announcement\n");
  });

  it("should broadcast to all connected clients", () => {
    const mockRes2 = {
      writeHead: jest.fn(),
      flushHeaders: jest.fn(),
      write: jest.fn(),
      on: jest.fn(),
    };
    const mockReq2 = new EventEmitter();

    sseService.addClient(101, mockRes, mockReq);
    sseService.addClient(102, mockRes2, mockReq2);

    sseService.broadcast("broadcast_event", { msg: "all" });

    expect(mockRes.write).toHaveBeenCalledWith("event: broadcast_event\n");
    expect(mockRes2.write).toHaveBeenCalledWith("event: broadcast_event\n");
  });

  it("should clean up connection when request is closed", () => {
    sseService.addClient(101, mockRes, mockReq);
    expect(sseService.getClientCount()).toBe(1);

    // Simulate client disconnect
    mockReq.emit("close");

    expect(sseService.getClientCount()).toBe(0);
  });
});
