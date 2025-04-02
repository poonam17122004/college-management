const express = require("express");
const {
  getAttendance,
  addAttendance,
} = require("../../controllers/Other/attendance.controller");
const router = express.Router();

router.post("/addattendance", addAttendance);
router.get("/getattendance", getAttendance);

module.exports = router;
