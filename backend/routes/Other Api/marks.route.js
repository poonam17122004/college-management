const express = require("express");
const { 
    getMarks, 
    addMarks, 
    deleteMarks,
    bulkUploadMarks,
    getMarksByParams,
    updateStudentMarks,
    deleteSubjectMarks,
    getGradeStatistics
} = require("../../controllers/Other/marks.controller");
const router = express.Router();

// GET routes
router.post("/getMarks", getMarks); // Keeping original route for backward compatibility
router.get("/byParams", getMarksByParams);
router.get("/statistics", getGradeStatistics);

// POST routes
router.post("/addMarks", addMarks);
router.post("/bulkUpload", bulkUploadMarks);

// PUT routes
router.put("/update/:enrollmentNo", updateStudentMarks);

// DELETE routes
router.delete("/deleteMarks/:id", deleteMarks);
router.delete("/deleteSubject/:enrollmentNo", deleteSubjectMarks);

module.exports = router;
