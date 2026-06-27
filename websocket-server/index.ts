import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 8000 });

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", (data) => {
    const message = JSON.parse(data.toString());
    console.log(message);

    if (message.method === "SUBSCRIBE") {
      // TODO: Save subscription

      ws.send(
        JSON.stringify({
          id: message.id,
          result: null,
          success: true,
        }),
      );
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});
