const express = require("express");
const router = express.Router();
const { getDetails, addDetails, updateDetails, deleteDetails, getCount, createExam } = require("../../controllers/Faculty/details.controller.js")
const upload = require("../../middlewares/multer.middleware.js")

router.post("/getDetails", getDetails);

router.post("/addDetails", upload.single("profile"), addDetails);

router.put("/updateDetails/:id", upload.single("profile"), updateDetails);

router.delete("/deleteDetails/:id", deleteDetails);

router.get("/count", getCount);

router.post("/createExam", createExam);

module.exports = router;
