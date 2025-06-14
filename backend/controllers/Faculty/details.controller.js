const facultyDetails = require("../../models/Faculty/details.model.js")
const Exam = require('../../models/Other/exam.model');

const getDetails = async (req, res) => {
    try {
        let user = await facultyDetails.find(req.body);
        if (!user) {
            return res
                .status(400)
                .json({ success: false, message: "No Faculty Found" });
        }
        const data = {
            success: true,
            message: "Faculty Details Found!",
            user,
        };
        res.json(data);
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

const addDetails = async (req, res) => {
    try {
        let user = await facultyDetails.findOne({ employeeId: req.body.employeeId });
        if (user) {
            return res.status(400).json({
                success: false,
                message: "Faculty With This EmployeeId Already Exists",
            });
        }
        user = await facultyDetails.create({ ...req.body, profile: req.file.filename });
        const data = {
            success: true,
            message: "Faculty Details Added!",
            user,
        };
        res.json(data);
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

const updateDetails = async (req, res) => {
    try {
        let user;
        if (req.file) {
            user = await facultyDetails.findByIdAndUpdate(req.params.id, { ...req.body, profile: req.file.filename });
        } else {
            user = await facultyDetails.findByIdAndUpdate(req.params.id, req.body);
        }
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "No Faculty Found",
            });
        }
        const data = {
            success: true,
            message: "Updated Successfull!",
        };
        res.json(data);
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}


const deleteDetails = async (req, res) => {
    try {
        let user = await facultyDetails.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "No Faculty Found",
            });
        }
        const data = {
            success: true,
            message: "Deleted Successfull!",
        };
        res.json(data);
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

const getCount = async (req, res) => {
    try {
        let user = await facultyDetails.count(req.body);
        const data = {
            success: true,
            message: "Count Successfull!",
            user,
        };
        res.json(data);
    } catch (error) {
        res
            .status(500)
            .json({ success: false, message: "Internal Server Error", error });
    }
}

// Create Exam (Faculty)
const createExam = async (req, res) => {
    try {
        const { name, date, branch, semester, subject, duration } = req.body;
        
        // Validate required fields
        if (!name || !date || !branch || !semester || !subject || !duration) {
            return res.status(400).json({
                success: false,
                message: "All fields (name, date, branch, semester, subject, duration) are required"
            });
        }

        // Check if faculty exists (using employeeId from body instead of req.user)
        const faculty = await facultyDetails.findOne({ employeeId: req.body.employeeId });
        
        if (!faculty) {
            return res.status(404).json({
                success: false,
                message: "Faculty not found"
            });
        }
        
        // Create new exam with faculty ID as createdBy
        const exam = new Exam({
            name,
            date: new Date(date),
            branch,
            semester,
            subject,
            duration: Number(duration),
            createdBy: faculty._id
        });
        
        await exam.save();
        
        const data = {
            success: true,
            message: "Exam created successfully",
            exam
        };
        
        res.status(201).json(data);
    } catch (error) {
        console.error("Error creating exam:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports = { getDetails, addDetails, updateDetails, deleteDetails, getCount, createExam }