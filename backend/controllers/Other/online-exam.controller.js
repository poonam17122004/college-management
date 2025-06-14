const OnlineExam = require('../../models/Other/online-exam.model');
const facultyDetails = require('../../models/Faculty/details.model');
const studentDetails = require('../../models/Students/details.model');

// Create a new online exam
exports.createExam = async (req, res) => {
  try {
    const { 
      name, description, instructions, startDate, endDate, duration, 
      branch, semester, subject, totalMarks, passingMarks, questions 
    } = req.body;
    
    // Validate required fields
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one question is required'
      });
    }
    
    const faculty = await facultyDetails.findOne({ employeeId: req.body.facultyId });
    
    if (!faculty) {
      return res.status(404).json({ 
        success: false, 
        message: 'Faculty not found'
      });
    }
    
    // Validate that questions add up to total marks
    const calculatedTotalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
    const parsedTotalMarks = parseInt(totalMarks, 10);
    
    if (isNaN(parsedTotalMarks)) {
      return res.status(400).json({
        success: false,
        message: 'Total marks must be a valid number'
      });
    }
    
    if (calculatedTotalMarks !== parsedTotalMarks) {
      return res.status(400).json({ 
        success: false, 
        message: `Sum of question marks (${calculatedTotalMarks}) does not match total marks (${parsedTotalMarks})`
      });
    }
    
    // Create new exam
    const newExam = new OnlineExam({
      name,
      description,
      instructions,
      startDate,
      endDate,
      duration,
      branch,
      semester,
      subject,
      totalMarks: parsedTotalMarks,
      passingMarks: parseInt(passingMarks, 10) || 0,
      questions,
      createdBy: faculty._id
    });
    
    await newExam.save();
    
    res.status(201).json({
      success: true,
      message: 'Exam created successfully',
      exam: newExam
    });
  } catch (error) {
    console.error('Error creating exam:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message
    });
  }
};

// Get all exams created by a faculty
exports.getFacultyExams = async (req, res) => {
  try {
    const faculty = await facultyDetails.findOne({ employeeId: req.query.facultyId });
    
    if (!faculty) {
      return res.status(404).json({ 
        success: false, 
        message: 'Faculty not found'
      });
    }
    
    const exams = await OnlineExam.find({ createdBy: faculty._id })
      .select('name subject branch semester startDate endDate status totalMarks');
    
    res.status(200).json({
      success: true,
      message: 'Exams retrieved successfully',
      exams
    });
  } catch (error) {
    console.error('Error fetching exams:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message
    });
  }
};

// Get a specific exam by ID
exports.getExamById = async (req, res) => {
  try {
    const exam = await OnlineExam.findById(req.params.id);
    
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Exam retrieved successfully',
      exam
    });
  } catch (error) {
    console.error('Error fetching exam:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message
    });
  }
};

// Update an exam
exports.updateExam = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Prevent updating submissions through this endpoint
    if (updateData.submissions) {
      delete updateData.submissions;
    }
    
    // Check if the exam exists
    const exam = await OnlineExam.findById(id);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }
    
    // If questions are being updated, validate total marks
    if (updateData.questions && updateData.totalMarks) {
      const calculatedTotalMarks = updateData.questions.reduce((sum, q) => sum + q.marks, 0);
      if (calculatedTotalMarks !== parseInt(updateData.totalMarks)) {
        return res.status(400).json({ 
          success: false, 
          message: `Sum of question marks (${calculatedTotalMarks}) does not match total marks (${updateData.totalMarks})`
        });
      }
    }
    
    // Update exam
    const updatedExam = await OnlineExam.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      message: 'Exam updated successfully',
      exam: updatedExam
    });
  } catch (error) {
    console.error('Error updating exam:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message
    });
  }
};

// Delete an exam
exports.deleteExam = async (req, res) => {
  try {
    const { id } = req.params;
    
    const exam = await OnlineExam.findById(id);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }
    
    // Check if exam has submissions
    if (exam.submissions && exam.submissions.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete exam with student submissions'
      });
    }
    
    await OnlineExam.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      message: 'Exam deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting exam:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message
    });
  }
};

// Publish an exam (change status from draft to published)
exports.publishExam = async (req, res) => {
  try {
    const { id } = req.params;
    
    const exam = await OnlineExam.findById(id);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }
    
    if (exam.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: `Exam is already ${exam.status}`
      });
    }
    
    exam.status = 'published';
    await exam.save();
    
    res.status(200).json({
      success: true,
      message: 'Exam published successfully',
      exam
    });
  } catch (error) {
    console.error('Error publishing exam:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message
    });
  }
};

// Get exams available for a student
exports.getStudentExams = async (req, res) => {
  try {
    const { enrollmentNo } = req.query;
    
    // Validate enrollment number parameter
    if (!enrollmentNo || enrollmentNo === 'undefined' || enrollmentNo === 'null') {
      return res.status(400).json({
        success: false,
        message: 'Missing or invalid enrollment number'
      });
    }

    // Parse to number if it's a numeric string
    const studentId = isNaN(Number(enrollmentNo)) ? enrollmentNo : Number(enrollmentNo);
    
    // Get student details to find branch and semester
    const student = await studentDetails.findOne({ enrollmentNo: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    // Get exams for the student's branch and semester
    const exams = await OnlineExam.find({
      branch: student.branch,
      semester: student.semester,
      status: { $in: ['published', 'ongoing'] },
      endDate: { $gte: new Date() }
    }).select('name subject startDate endDate duration totalMarks status');
    
    res.status(200).json({
      success: true,
      message: 'Available exams retrieved successfully',
      exams
    });
  } catch (error) {
    console.error('Error fetching student exams:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message
    });
  }
};

// Start an exam for a student
exports.startExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const { enrollmentNo } = req.body;
    
    // Find the exam
    const exam = await OnlineExam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }
    
    // Check if exam is available
    if (exam.status !== 'published' && exam.status !== 'ongoing') {
      return res.status(400).json({
        success: false,
        message: 'Exam is not available for taking'
      });
    }
    
    // Check if current date is within exam dates
    const now = new Date();
    if (now < new Date(exam.startDate) || now > new Date(exam.endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Exam is not currently active'
      });
    }
    
    // Check if student has already started/submitted the exam
    const existingSubmission = exam.submissions.find(sub => sub.studentId == enrollmentNo);
    if (existingSubmission) {
      if (existingSubmission.status === 'submitted') {
        return res.status(400).json({
          success: false,
          message: 'You have already submitted this exam'
        });
      } else {
        // Return the in-progress exam
        return res.status(200).json({
          success: true,
          message: 'Continuing exam session',
          submission: existingSubmission,
          exam: {
            name: exam.name,
            description: exam.description,
            instructions: exam.instructions,
            duration: exam.duration,
            totalMarks: exam.totalMarks,
            questions: exam.questions
          }
        });
      }
    }
    
    // Create a new submission for the student
    const newSubmission = {
      studentId: enrollmentNo,
      startTime: new Date(),
      answers: exam.questions.map(q => ({
        questionId: q._id,
        answer: '',
        marks: 0
      })),
      status: 'in-progress'
    };
    
    exam.submissions.push(newSubmission);
    await exam.save();
    
    // Update exam status to ongoing if it was published
    if (exam.status === 'published') {
      exam.status = 'ongoing';
      await exam.save();
    }
    
    res.status(200).json({
      success: true,
      message: 'Exam started successfully',
      submission: exam.submissions[exam.submissions.length - 1],
      exam: {
        name: exam.name,
        description: exam.description,
        instructions: exam.instructions,
        duration: exam.duration,
        totalMarks: exam.totalMarks,
        questions: exam.questions
      }
    });
  } catch (error) {
    console.error('Error starting exam:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message
    });
  }
};

// Save a student's answer during the exam
exports.saveAnswer = async (req, res) => {
  try {
    const { examId } = req.params;
    const { enrollmentNo, questionId, answer } = req.body;
    
    // Validate required parameters
    if (!examId || examId === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'Invalid exam ID provided'
      });
    }

    if (!enrollmentNo || !questionId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: enrollmentNo or questionId'
      });
    }
    
    const exam = await OnlineExam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }
    
    // Find student's submission
    const submissionIndex = exam.submissions.findIndex(sub => sub.studentId == enrollmentNo);
    if (submissionIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found. Please start the exam first'
      });
    }
    
    const submission = exam.submissions[submissionIndex];
    
    // Check if submission is still in progress
    if (submission.status !== 'in-progress') {
      return res.status(400).json({
        success: false,
        message: 'Exam has already been submitted'
      });
    }
    
    // Find the answer object for the question
    const answerIndex = submission.answers.findIndex(ans => ans.questionId.toString() === questionId);
    if (answerIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Question not found in this exam'
      });
    }
    
    // Update the answer
    submission.answers[answerIndex].answer = answer;
    
    // Find the question to check if it can be auto-evaluated
    const question = exam.questions.find(q => q._id.toString() === questionId);
    
    // Auto-evaluate MCQ, oneWord, and fillBlank questions
    if (question && ['mcq', 'oneWord', 'fillBlank'].includes(question.type)) {
      const isCorrect = question.correctAnswer.toLowerCase() === answer.toLowerCase();
      submission.answers[answerIndex].isCorrect = isCorrect;
      submission.answers[answerIndex].marks = isCorrect ? question.marks : 0;
    }
    
    // Save the changes
    exam.markModified('submissions');
    await exam.save();
    
    res.status(200).json({
      success: true,
      message: 'Answer saved successfully'
    });
  } catch (error) {
    console.error('Error saving answer:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message
    });
  }
};

// Submit an exam
exports.submitExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const { enrollmentNo } = req.body;
    
    // Validate required parameters
    if (!examId || examId === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'Invalid exam ID provided'
      });
    }

    if (!enrollmentNo) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: enrollmentNo'
      });
    }

    console.log(`Processing exam submission - ExamID: ${examId}, Student: ${enrollmentNo}`);
    
    const exam = await OnlineExam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }
    
    // Find student's submission
    const submissionIndex = exam.submissions.findIndex(sub => sub.studentId == enrollmentNo);
    if (submissionIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found. Please start the exam first.'
      });
    }
    
    const submission = exam.submissions[submissionIndex];
    
    // Check if submission is still in progress
    if (submission.status !== 'in-progress') {
      return res.status(400).json({
        success: false,
        message: 'Exam has already been submitted'
      });
    }
    
    // Update submission status and submit time
    submission.status = 'submitted';
    submission.submitTime = new Date();
    
    // Calculate total marks for auto-evaluated questions (MCQ, oneWord, fillBlank)
    let totalMarks = 0;
    let allQuestionsEvaluated = true;
    
    // Use try-catch inside the loop to handle individual question errors
    for (const answer of submission.answers) {
      try {
        // Validate the question exists before accessing
        const question = exam.questions.find(q => q._id.toString() === answer.questionId.toString());
        if (!question) {
          console.warn(`Question ID ${answer.questionId} not found in exam ${examId}`);
          continue; // Skip this answer if question not found
        }
        
        totalMarks += answer.marks || 0;
        
        // Check if there are any unevaluated short or long answers
        if (['shortAnswer', 'longAnswer'].includes(question.type) && answer.answer) {
          allQuestionsEvaluated = false;
        }
      } catch (err) {
        console.error(`Error processing answer: ${err.message}`);
        // Continue with other answers
      }
    }
    
    submission.totalMarks = totalMarks;
    
    // If all questions are evaluated (no short/long answers), mark as fully evaluated
    if (allQuestionsEvaluated) {
      submission.status = 'evaluated';
    }
    
    // Save the changes and handle possible MongoDB validation errors
    try {
      exam.markModified('submissions');
      await exam.save();
      
      // Only update exam status after successful save of submission
      let examStatusChanged = false;
      
      // Check if all students have submitted and update exam status if needed
      const allSubmitted = exam.submissions.every(sub => 
        sub.status === 'submitted' || sub.status === 'evaluated' || sub.status === 'partial-evaluated');
      
      if (allSubmitted && exam.status === 'ongoing') {
        exam.status = 'completed';
        examStatusChanged = true;
      }
      
      // Only save again if exam status changed
      if (examStatusChanged) {
        await exam.save();
      }
      
      res.status(200).json({
        success: true,
        message: 'Exam submitted successfully',
        autoEvaluatedMarks: totalMarks,
        requiresManualEvaluation: !allQuestionsEvaluated
      });
    } catch (saveError) {
      console.error('Error saving exam submission:', saveError);
      res.status(500).json({
        success: false,
        message: 'Failed to save exam submission',
        error: saveError.message
      });
    }
  } catch (error) {
    console.error('Error submitting exam:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message
    });
  }
};

// Get submissions for a specific exam
exports.getExamSubmissions = async (req, res) => {
  try {
    const { examId } = req.params;
    
    const exam = await OnlineExam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }
    
    // Get basic student information for each submission
    const submissionsWithStudentInfo = await Promise.all(
      exam.submissions.map(async (submission) => {
        const student = await studentDetails.findOne({ enrollmentNo: submission.studentId });
        
        return {
          submissionId: submission._id,
          studentId: submission.studentId,
          studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown Student',
          startTime: submission.startTime,
          submitTime: submission.submitTime,
          totalMarks: submission.totalMarks,
          status: submission.status
        };
      })
    );
    
    res.status(200).json({
      success: true,
      message: 'Submissions retrieved successfully',
      examName: exam.name,
      totalMarks: exam.totalMarks,
      submissions: submissionsWithStudentInfo
    });
  } catch (error) {
    console.error('Error getting exam submissions:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message
    });
  }
};

// Get a specific student's submission for evaluation
exports.getSubmissionForEvaluation = async (req, res) => {
  try {
    const { examId, submissionId } = req.params;
    
    const exam = await OnlineExam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }
    
    // Find the submission
    const submission = exam.submissions.id(submissionId);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }
    
    // Get student details
    const student = await studentDetails.findOne({ enrollmentNo: submission.studentId });
    
    // Combine question data with answer data
    const questionsWithAnswers = submission.answers.map(answer => {
      const question = exam.questions.find(q => q._id.toString() === answer.questionId.toString());
      return {
        questionId: answer.questionId,
        type: question.type,
        question: question.question,
        options: question.options,
        correctAnswer: question.correctAnswer,
        maxMarks: question.marks,
        studentAnswer: answer.answer,
        isCorrect: answer.isCorrect,
        awardedMarks: answer.marks,
        needsEvaluation: ['shortAnswer', 'longAnswer'].includes(question.type)
      };
    });
    
    res.status(200).json({
      success: true,
      message: 'Submission retrieved for evaluation',
      examName: exam.name,
      studentInfo: student ? {
        id: student.enrollmentNo,
        name: `${student.firstName} ${student.lastName}`
      } : { id: submission.studentId, name: 'Unknown Student' },
      submissionInfo: {
        startTime: submission.startTime,
        submitTime: submission.submitTime,
        status: submission.status,
        currentMarks: submission.totalMarks,
        maxMarks: exam.totalMarks
      },
      questionsWithAnswers
    });
  } catch (error) {
    console.error('Error getting submission for evaluation:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message
    });
  }
};

// Evaluate a submission (for short/long answers)
exports.evaluateSubmission = async (req, res) => {
  try {
    const { examId, submissionId } = req.params;
    const { evaluations, facultyId } = req.body;
    
    // Validate evaluations format
    if (!Array.isArray(evaluations)) {
      return res.status(400).json({
        success: false,
        message: 'Evaluations must be an array'
      });
    }
    
    const faculty = await facultyDetails.findOne({ employeeId: facultyId });
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found'
      });
    }
    
    const exam = await OnlineExam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }
    
    // Find the submission
    const submission = exam.submissions.id(submissionId);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }
    
    // Check if submission has been submitted
    if (submission.status === 'in-progress') {
      return res.status(400).json({
        success: false,
        message: 'Cannot evaluate an in-progress submission'
      });
    }
    
    // Update evaluated answers
    let totalMarks = 0;
    let allEvaluated = true;
    
    // Process each evaluation
    for (const evaluation of evaluations) {
      const answerIndex = submission.answers.findIndex(a => 
        a.questionId.toString() === evaluation.questionId);
      
      if (answerIndex !== -1) {
        // Update marks
        submission.answers[answerIndex].marks = Math.min(
          evaluation.marks, 
          exam.questions.find(q => q._id.toString() === evaluation.questionId).marks
        );
        
        // Update evaluation metadata
        submission.answers[answerIndex].evaluatedBy = faculty._id;
        submission.answers[answerIndex].evaluatedAt = new Date();
      }
    }
    
    // Recalculate total marks and check if all answers are evaluated
    submission.answers.forEach(answer => {
      totalMarks += answer.marks;
      
      // Check if there are any unevaluated short/long answers with content
      const question = exam.questions.find(q => q._id.toString() === answer.questionId.toString());
      if (question && 
          ['shortAnswer', 'longAnswer'].includes(question.type) && 
          answer.answer && 
          !answer.evaluatedAt) {
        allEvaluated = false;
      }
    });
    
    submission.totalMarks = totalMarks;
    
    // Update submission status
    if (allEvaluated) {
      submission.status = 'evaluated';
    } else {
      submission.status = 'partial-evaluated';
    }
    
    // Save the changes
    exam.markModified('submissions');
    await exam.save();
    
    res.status(200).json({
      success: true,
      message: 'Submission evaluated successfully',
      totalMarks,
      status: submission.status
    });
  } catch (error) {
    console.error('Error evaluating submission:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message
    });
  }
};

// Get student's result for an exam
exports.getStudentResult = async (req, res) => {
  try {
    const { examId } = req.params;
    const { enrollmentNo } = req.query;
    
    const exam = await OnlineExam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }
    
    // Find student's submission
    const submission = exam.submissions.find(sub => sub.studentId == enrollmentNo);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }
    
    // Only allow viewing results if the exam is completed or the submission is evaluated
    if (exam.status !== 'completed' && submission.status !== 'evaluated') {
      return res.status(403).json({
        success: false,
        message: 'Results are not available yet'
      });
    }
    
    // Combine question data with answer data
    const questionsWithAnswers = submission.answers.map(answer => {
      const question = exam.questions.find(q => q._id.toString() === answer.questionId.toString());
      return {
        questionId: answer.questionId,
        type: question.type,
        question: question.question,
        options: question.options,
        correctAnswer: question.correctAnswer,
        maxMarks: question.marks,
        studentAnswer: answer.answer,
        isCorrect: answer.isCorrect,
        awardedMarks: answer.marks
      };
    });
    
    const result = {
      examName: exam.name,
      subject: exam.subject,
      totalMarks: submission.totalMarks,
      maxMarks: exam.totalMarks,
      passingMarks: exam.passingMarks,
      passed: submission.totalMarks >= exam.passingMarks,
      percentage: ((submission.totalMarks / exam.totalMarks) * 100).toFixed(2),
      submittedOn: submission.submitTime,
      questions: questionsWithAnswers
    };
    
    res.status(200).json({
      success: true,
      message: 'Results retrieved successfully',
      result
    });
  } catch (error) {
    console.error('Error getting student results:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message
    });
  }
};