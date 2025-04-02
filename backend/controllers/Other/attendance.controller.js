const Attendance = require("../../models/Other/attendance.model");

// Submit attendance
exports.addAttendance = async (req, res) => {
  try {
    const { attendanceData } = req.body;

    await Promise.all(
      attendanceData.map(async ({ enrollmentNo, presentDays, totalDays }) => {
        // console.log(
        //   "Updating attendance for:",
        //   enrollmentNo,
        //   presentDays,
        //   totalDays
        // );

        // Update attendance if exists, otherwise create a new document
        await Attendance.findOneAndUpdate(
          { enrollmentNo }, // Search by enrollment number
          {
            present: presentDays, // Update present days
            total: totalDays, // Update total days
          },
          { new: true, upsert: true } // Ensure the document is updated or created if not found
        );
      })
    );

    res.status(200).send("Attendance updated successfully.");
  } catch (error) {
    console.error("Error updating attendance:", error);
    res.status(500).send("Error updating attendance.");
  }
};

exports.getAttendance = async (req, res) => {
  const { enrollmentNo } = req.query;
  try {
    let attendance = await Attendance.findOne({ enrollmentNo });
    if (!attendance) {
      return res
        .status(400)
        .json({ success: false, message: "attendence Not Available" });
    }
    const data = {
      success: true,
      message: "Attendance Loaded!",
      attendance,
    };
    res.json(data);
  } catch (error) {
    // console.error(error.message);
    console.log(error);
    res
      .status(500)
      .json({ success: false, message: "Attendance can't be fetched" });
  }
};
