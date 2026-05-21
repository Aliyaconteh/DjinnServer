const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const http = require("http");
const { Server } = require("socket.io");

const app = require("./src/app/app");
const initSockets = require("./src/sockets");

const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;

  if (!token) return next();

  const { supabase } = require("./src/config/supabase.config");

  const { data, error } = await supabase.auth.getUser(token);

  if (error) return next(new Error("Invalid token"));

  socket.user = data.user;

  next();
});

initSockets(io);

// Server port
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
