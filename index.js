const connectToMongo = require("./Database/db");
const express = require("express");
const app = express();
const path = require("path");
connectToMongo();
const port = 5001 ;
var cors = require("cors");
const attendanceRouter = require("./routes/Other Api/attendance.route");


app.use(
  cors({
    origin:"*",
    methods: "GET,POST,PUT,DELETE",
    credentials: true
  })
);

app.use(express.json()); //to convert request data to json

app.get("/", (req, res) => {
  res.send("Hello 👋 I am Working Fine 🚀");
});

app.use("/media", express.static(path.join(__dirname, "media")));

// Credential Apis
app.use("/api/student/auth", require("./routes/Student Api/credential.route"));
app.use("/api/faculty/auth", require("./routes/Faculty Api/credential.route"));
app.use("/api/admin/auth", require("./routes/Admin Api/credential.route"));
// Details Apis
app.use("/api/student/details", require("./routes/Student Api/details.route"));
app.use("/api/faculty/details", require("./routes/Faculty Api/details.route"));
app.use("/api/admin/details", require("./routes/Admin Api/details.route"));
// Other Apis
app.use("/api/timetable", require("./routes/Other Api/timetable.route"));
app.use("/api/material", require("./routes/Other Api/material.route"));
app.use("/api/notice", require("./routes/Other Api/notice.route"));
app.use("/api/subject", require("./routes/Other Api/subject.route"));
app.use("/api/marks", require("./routes/Other Api/marks.route"));
app.use("/api/attendance", attendanceRouter);
app.use("/api/branch", require("./routes/Other Api/branch.route"));

// Production deployment: serve frontend build
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, "../frontend/build")));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/build", "index.html"));
  });
}

app.listen(port, () => {
  console.log(`Server Listening On http://localhost:${port}`);
});
