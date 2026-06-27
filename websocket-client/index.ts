// connect to server

const socket = new WebSocket("ws://localhost:8000");

//connection established

socket.onopen = () => {
  console.log("Connected to server");

  socket.send(
    JSON.stringify({
      method: "SUBSCRIBE",
      params: ["depth.200ms.SOL_USDC"],
      id: 3,
    }),
  );
};

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data);
};

socket.onclose = () => {
  console.log("Disconnected");
};
