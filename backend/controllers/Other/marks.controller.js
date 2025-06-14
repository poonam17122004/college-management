const Marks = require("../../models/Other/marks.model.js");

const getMarks = async (req, res) => {
    try {
        let Mark = await Marks.find(req.body);
        if (!Mark) {
            return res
                .status(400)
                .json({ success: false, message: "Marks Not Available" });
        }
        const data = {
            success: true,
            message: "All Marks Loaded!",
            Mark,
        };
        res.json(data);
    } catch (error) {
        console.error(error.message);
        console.log(error)
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

// Get marks by parameters (branch, semester, subject) for faculty view
const getMarksByParams = async (req, res) => {
    try {
        const { branch, semester, subject, examType } = req.query;
        
        console.log("Marks request params:", { branch, semester, subject, examType });
        
        if (!branch || !semester || !subject || !examType) {
            return res.status(400).json({
                success: false,
                message: "Missing required parameters: branch, semester, subject, examType"
            });
        }
        
        // Get student enrollments matching branch and semester
        const Student = require("../../models/Students/details.model");
        const studentEnrollments = await Student
            .find({ branch, semester }, 'enrollmentNo firstName lastName')
            .lean();
            
        console.log(`Found ${studentEnrollments.length} students in branch ${branch} semester ${semester}`);
        
        // Get marks for these students
        const studentIds = studentEnrollments.map(s => s.enrollmentNo);
        const marksData = await Marks.find({ enrollmentNo: { $in: studentIds } }).lean();
        
        console.log(`Found ${marksData.length} mark records for these students`);
        
        // Map marks to students
        const results = studentEnrollments.map(student => {
            const studentMarks = marksData.find(m => m.enrollmentNo === student.enrollmentNo);
            const markValue = studentMarks && studentMarks[examType] ? 
                studentMarks[examType][subject] || '' : '';
            
            return {
                ...student,
                marks: markValue
            };
        });
        
        res.json({
            success: true,
            message: "Marks data retrieved successfully",
            data: results
        });
    } catch (error) {
        console.error("Error fetching marks by parameters:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal Server Error",
            error: error.message
        });
    }
};

const addMarks = async (req, res) => {
    let { enrollmentNo, internal, external } = req.body;
    try {
        let existingMarks = await Marks.findOne({ enrollmentNo });
        if (existingMarks) {
            if (internal) {
                existingMarks.internal = { ...existingMarks.internal, ...internal }
            }
            if (external) {
                existingMarks.external = { ...existingMarks.external, ...external }
            }
            await existingMarks.save()
            const data = {
                success: true,
                message: "Marks Added!",
            };
            res.json(data);
        } else {
            await Marks.create(req.body);
            const data = {
                success: true,
                message: "Marks Added!",
            };
            res.json(data);
        }
    } catch (error) {
        console.error(error.message);
        console.log(error)
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

// Bulk upload marks
const bulkUploadMarks = async (req, res) => {
    try {
        const { students, subject, examType } = req.body;
        
        if (!students || !Array.isArray(students)) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid data format. Expected 'students' array."
            });
        }
        
        // Process each student's marks
        const results = await Promise.all(
            students.map(async (student) => {
                const { enrollmentNo, marks } = student;
                if (!enrollmentNo || marks === undefined) {
                    return { enrollmentNo, status: 'error', message: 'Missing required fields' };
                }

                try {
                    // Validate marks (assuming marks are between 0-100)
                    const markValue = Number(marks);
                    if (isNaN(markValue) || markValue < 0 || markValue > 100) {
                        return { 
                            enrollmentNo, 
                            status: 'error', 
                            message: 'Invalid marks value. Must be between 0-100' 
                        };
                    }

                    let existingMarks = await Marks.findOne({ enrollmentNo });
                    
                    if (existingMarks) {
                        // Update existing marks
                        if (!existingMarks[examType]) {
                            existingMarks[examType] = {};
                        }
                        existingMarks[examType][subject] = markValue;
                        await existingMarks.save();
                    } else {
                        // Create new marks document
                        const newMarks = {
                            enrollmentNo,
                            [examType]: { [subject]: markValue }
                        };
                        await Marks.create(newMarks);
                    }
                    return { enrollmentNo, status: 'success' };
                } catch (error) {
                    console.error(`Error processing student ${enrollmentNo}:`, error);
                    return { enrollmentNo, status: 'error', message: error.message };
                }
            })
        );
        
        const successful = results.filter(r => r.status === 'success').length;
        const failed = results.filter(r => r.status === 'error').length;
        
        res.json({
            success: true,
            message: `Marks uploaded: ${successful} successful, ${failed} failed`,
            details: results
        });
    } catch (error) {
        console.error("Bulk upload error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// Update marks for a specific student
const updateStudentMarks = async (req, res) => {
    try {
        const { enrollmentNo } = req.params;
        const { subject, examType, marks } = req.body;

        if (!subject || !examType || marks === undefined) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: subject, examType, marks"
            });
        }

        // Validate marks
        const markValue = Number(marks);
        if (isNaN(markValue)) {
            return res.status(400).json({
                success: false,
                message: "Marks must be a number"
            });
        }

        // Use $set for atomic update
        const update = { $set: { [`${examType}.${subject}`]: markValue, enrollmentNo } };
        const options = { upsert: true, new: true, setDefaultsOnInsert: true };

        await Marks.findOneAndUpdate(
            { enrollmentNo },
            update,
            options
        );

        res.json({
            success: true,
            message: "Marks updated successfully"
        });
    } catch (error) {
        console.error("Error updating student marks:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

const deleteMarks = async (req, res) => {
    try {
        let mark = await Marks.findByIdAndDelete(req.params.id);
        if (!mark) {
            return res
                .status(400)
                .json({ success: false, message: "No Marks Data Exists!" });
        }
        const data = {
            success: true,
            message: "Marks Deleted!",
        };
        res.json(data);
    } catch (error) {
        console.error(error.message);
        console.log(error)
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

// Delete specific marks for a subject
const deleteSubjectMarks = async (req, res) => {
    try {
        const { enrollmentNo } = req.params;
        const { subject, examType } = req.query;
        
        if (!subject || !examType) {
            return res.status(400).json({
                success: false,
                message: "Missing required query parameters: subject, examType"
            });
        }
        
        const marksDoc = await Marks.findOne({ enrollmentNo });
        
        if (!marksDoc) {
            return res.status(404).json({
                success: false,
                message: "No marks found for this student"
            });
        }
        
        if (marksDoc[examType] && marksDoc[examType][subject]) {
            // Remove the specific subject marks
            delete marksDoc[examType][subject];
            await marksDoc.save();
            
            res.json({
                success: true,
                message: "Subject marks deleted successfully"
            });
        } else {
            res.status(404).json({
                success: false,
                message: "Subject marks not found"
            });
        }
    } catch (error) {
        console.error("Error deleting subject marks:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

// Calculate and get grade statistics
const getGradeStatistics = async (req, res) => {
    try {
        const { branch, semester, subject, examType } = req.query;
        
        console.log("Statistics request params:", { branch, semester, subject, examType });
        
        if (!branch || !semester || !subject || !examType) {
            return res.status(400).json({
                success: false,
                message: "Missing required query parameters: branch, semester, subject, examType"
            });
        }
        
        // Get student enrollments in this branch and semester
        const Student = require("../../models/Students/details.model");
        const studentEnrollments = await Student
            .find({ branch, semester }, 'enrollmentNo')
            .lean();
            
        console.log(`Found ${studentEnrollments.length} students in branch ${branch} semester ${semester} for statistics`);
        
        if (studentEnrollments.length === 0) {
            return res.json({
                success: true,
                message: "No students found in this branch and semester",
                data: {
                    total: 0,
                    average: 0,
                    highest: 0,
                    lowest: 0,
                    gradeDistribution: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 }
                }
            });
        }
        
        const studentIds = studentEnrollments.map(s => s.enrollmentNo);
        
        // Get all marks for these students
        const marksData = await Marks.find({ enrollmentNo: { $in: studentIds } }).lean();
        console.log(`Found ${marksData.length} mark records for statistics calculation`);
        
        // Process marks to get statistics
        const stats = {
            total: 0,
            average: 0,
            highest: 0,
            lowest: 100,
            gradeDistribution: {
                A: 0, // 90-100
                B: 0, // 80-89
                C: 0, // 70-79
                D: 0, // 60-69
                E: 0, // 50-59
                F: 0  // Below 50
            }
        };
        
        let validMarksCount = 0;
        let totalMarks = 0;
        
        marksData.forEach(record => {
            if (record[examType] && record[examType][subject] !== undefined) {
                const mark = Number(record[examType][subject]);
                if (!isNaN(mark)) {
                    validMarksCount++;
                    totalMarks += mark;
                    
                    // Update highest and lowest
                    stats.highest = Math.max(stats.highest, mark);
                    stats.lowest = Math.min(stats.lowest, mark);
                    
                    // Update grade distribution
                    if (mark >= 90) stats.gradeDistribution.A++;
                    else if (mark >= 80) stats.gradeDistribution.B++;
                    else if (mark >= 70) stats.gradeDistribution.C++;
                    else if (mark >= 60) stats.gradeDistribution.D++;
                    else if (mark >= 50) stats.gradeDistribution.E++;
                    else stats.gradeDistribution.F++;
                }
            }
        });
        
        console.log(`Found ${validMarksCount} valid marks for the subject ${subject}`);
        
        stats.total = validMarksCount;
        stats.average = validMarksCount > 0 ? (totalMarks / validMarksCount).toFixed(2) : 0;
        
        // If no valid marks were found
        if (validMarksCount === 0) {
            stats.lowest = 0;
        }
        
        res.json({
            success: true,
            message: "Grade statistics calculated successfully",
            data: stats
        });
    } catch (error) {
        console.error("Error calculating grade statistics:", error);
        res.status(500).json({
            success: false, 
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports = { 
    getMarks, 
    addMarks, 
    deleteMarks, 
    bulkUploadMarks,
    getMarksByParams,
    updateStudentMarks,
    deleteSubjectMarks,
    getGradeStatistics
}