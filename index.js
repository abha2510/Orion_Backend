const express = require("express");
const { connection } = require("./db");
const cors = require("cors");
const userRoutes = require("./routes/User.Route");

require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("Enhanced Dynamic FAQ System");
});

app.use("/", userRoutes);

app.listen(process.env.PORT, async () => {
  try {
    await connection;
    console.log("Connected to the DataBase!!!");
  } catch (err) {
    console.log("Data connection Failed");
  }
  console.log("Server is Running on port", process.env.PORT);
});
