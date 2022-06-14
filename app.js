const express = require("express");
const cors = require("cors");
const fileUpload = require("express-fileupload");

const uuid = require("uuid");

const app = express();
const port = 3000;

app.use(fileUpload());

app.use(cors());

app.use("/assets", express.static(__dirname + "/assets"));
app.use("/media", express.static(__dirname + "/media"));

app.route("/upload").post(async function (req, res) {
  const filePath = "/media/" + uuid.v4().toString() + "_" + req.files.file.name;
  await req.files.file.mv(__dirname + filePath);
  res.send({ status: "ok", path: filePath });
});

app.get("/", (req, res) => res.sendFile(__dirname + "/index.html"));

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
