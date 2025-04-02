const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    enrollmentNo: {
      type: String,
      required: true,
    },
    present: {
      type: Number,
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Attendance", attendanceSchema);
