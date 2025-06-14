import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiArrowLeft, FiClock, FiFileText, FiChevronRight } from 'react-icons/fi';
import Heading from '../../components/Heading';
import { baseApiURL } from '../../baseUrl';

const OnlineExam = () => {
  // View states: list, instructions, exam, results
  const [view, setView] = useState('list');
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState(null);
  const [examSession, setExamSession] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [examResult, setExamResult] = useState(null);
  // Store the exam ID separately to prevent submission issues
  const [activeExamId, setActiveExamId] = useState(null);
  
  // Get student data from Redux store
  const userData = useSelector((state) => state.userData);
  
  // Timer interval reference
  const [timerInterval, setTimerIntervalRef] = useState(null);

  // Fetch available exams for this student
  useEffect(() => {
    if (view === 'list') {
      fetchAvailableExams();
    }
    
    // Clear timer when component unmounts or view changes
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [view]);
  
  // Preserve exam ID in activeExamId whenever selectedExam changes
  useEffect(() => {
    if (selectedExam && selectedExam._id) {
      setActiveExamId(selectedExam._id);
      // Also store in sessionStorage as a backup
      sessionStorage.setItem('activeExamId', selectedExam._id);
    }
  }, [selectedExam]);

  // Retrieve exam ID from sessionStorage on component mount
  useEffect(() => {
    const storedExamId = sessionStorage.getItem('activeExamId');
    if (storedExamId && !activeExamId) {
      setActiveExamId(storedExamId);
    }
    
    return () => {
      // Clean up when component unmounts and we're not in exam mode
      if (view !== 'exam' && view !== 'instructions') {
        sessionStorage.removeItem('activeExamId');
      }
    };
  }, []);

  const fetchAvailableExams = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${baseApiURL()}/online-exam/student/available?enrollmentNo=${userData.enrollmentNo}`
      );
      
      if (response.data.success) {
        setExams(response.data.exams);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
      toast.error('Failed to load available exams');
    } finally {
      setLoading(false);
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Start an exam
  const handleStartExam = async (examId) => {
    try {
      // Store exam ID in session storage immediately, in case of navigation issues
      sessionStorage.setItem('activeExamId', examId);
      setActiveExamId(examId);
      
      toast.loading('Loading exam...');
      
      const response = await axios.post(
        `${baseApiURL()}/online-exam/${examId}/start`,
        { enrollmentNo: userData.enrollmentNo }
      );
      
      toast.dismiss();
      
      if (response.data.success) {
        const examData = response.data.exam;
        setSelectedExam(examData);
        setExamSession(response.data.submission);
        
        // Store even more exam context in sessionStorage to prevent data loss
        try {
          const examContext = {
            examId: examData._id,
            name: examData.name,
            duration: examData.duration,
            totalQuestions: examData.questions.length
          };
          sessionStorage.setItem('examContext', JSON.stringify(examContext));
        } catch (err) {
          console.warn('Failed to store exam context in session storage:', err);
        }
        
        // Initialize answers state from saved answers
        const savedAnswers = {};
        response.data.submission.answers.forEach(ans => {
          savedAnswers[ans.questionId] = ans.answer;
        });
        setAnswers(savedAnswers);
        
        // Calculate time left
        if (response.data.submission.startTime) {
          const startTime = new Date(response.data.submission.startTime);
          const endTime = new Date(startTime.getTime() + (examData.duration * 60 * 1000));
          const now = new Date();
          const remainingMs = endTime - now;
          
          if (remainingMs > 0) {
            setTimeLeft(Math.floor(remainingMs / 1000));
            startTimer(Math.floor(remainingMs / 1000));
          } else {
            // Time's up!
            setTimeLeft(0);
            toast.error('Exam time is up! Your answers will be submitted automatically.');
            handleSubmitExam();
            return;
          }
        }
        
        // Show instructions first
        setView('instructions');
      } else {
        toast.error(response.data.message);
        sessionStorage.removeItem('activeExamId');
        setActiveExamId(null);
      }
    } catch (error) {
      toast.dismiss();
      console.error('Error starting exam:', error);
      toast.error(error.response?.data?.message || 'Failed to start exam');
      sessionStorage.removeItem('activeExamId');
      setActiveExamId(null);
    }
  };
  
  // Start countdown timer
  const startTimer = (seconds) => {
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    
    const newInterval = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          clearInterval(newInterval);
          toast.error('Time is up! Your answers will be submitted automatically.');
          
          // Use activeExamId for submission to ensure we always have a valid ID
          const examId = selectedExam?._id || activeExamId;
          if (examId) {
            handleSubmitExam();
          } else {
            toast.error('Cannot submit exam: No exam ID available');
          }
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
    
    setTimerIntervalRef(newInterval);
  };
  
  // Submit exam using stored ID (for timed expiration)
  const submitExamById = async (examId) => {
    // Try to use provided examId first, then fall back to activeExamId
    const actualExamId = examId || activeExamId;
    
    if (!actualExamId) {
      console.error("Cannot submit exam: Invalid exam ID");
      toast.error("Cannot submit exam: Invalid exam data");
      return;
    }
    
    try {
      toast.loading('Submitting exam...');
      
      console.log(`Submitting exam ${actualExamId} for student ${userData.enrollmentNo}`);
      
      // Include answers in automatic submission to ensure they're all captured
      const response = await axios.post(
        `${baseApiURL()}/online-exam/${actualExamId}/submit`,
        { 
          enrollmentNo: userData.enrollmentNo,
          answers: Object.entries(answers).map(([questionId, answer]) => ({ 
            questionId, 
            answer 
          }))
        },
        { 
          headers: { 'Content-Type': 'application/json' },
          timeout: 60000 // Increased to 60 seconds timeout
        }
      );
      
      toast.dismiss();
      
      if (response.data.success) {
        toast.success('Exam submitted successfully!');
        
        // Stop the timer
        if (timerInterval) {
          clearInterval(timerInterval);
          setTimerIntervalRef(null);
        }
        
        // Go back to list view since we can't reliably fetch results
        setView('list');
        fetchAvailableExams();
      } else {
        toast.error(response.data.message || 'Failed to submit exam');
      }
    } catch (error) {
      toast.dismiss();
      console.error('Error submitting exam:', error);
      
      let errorMessage = 'Failed to submit exam. Please try again.';
      
      if (error.response) {
        errorMessage = `Failed to submit exam: ${error.response.data?.message || error.response.status}`;
      } else if (error.request) {
        errorMessage = 'Server did not respond. Your network connection might be unstable.';
      }
      
      toast.error(errorMessage);
      
      // Offer retry option
      setTimeout(() => {
        if (window.confirm('Would you like to try submitting again?')) {
          submitExamById(actualExamId);
        }
      }, 1000);
    }
  };
  
  // Save answer for current question
  const saveAnswer = async (questionId, answer) => {
    if (!selectedExam || !selectedExam._id) {
      console.error("Cannot save answer: No exam selected or invalid exam ID");
      return;
    }

    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
    
    try {
      const examId = selectedExam._id;
      console.log(`Saving answer for exam ${examId}, question ${questionId}`);
      
      await axios.post(
        `${baseApiURL()}/online-exam/${examId}/saveAnswer`,
        {
          enrollmentNo: userData.enrollmentNo,
          questionId,
          answer
        }
      );
    } catch (error) {
      console.error('Error saving answer:', error);
      // Continue even if save fails - we'll retry on next/prev question
    }
  };
  
  // Move to next question
  const handleNextQuestion = async () => {
    const currentQuestion = selectedExam.questions[currentQuestionIndex];
    
    // Save current answer before moving
    if (currentQuestion) {
      await saveAnswer(currentQuestion._id, answers[currentQuestion._id] || '');
    }
    
    if (currentQuestionIndex < selectedExam.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };
  
  // Move to previous question
  const handlePrevQuestion = async () => {
    const currentQuestion = selectedExam.questions[currentQuestionIndex];
    
    // Save current answer before moving
    if (currentQuestion) {
      await saveAnswer(currentQuestion._id, answers[currentQuestion._id] || '');
    }
    
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  
  // Submit the exam
  const handleSubmitExam = async () => {
    // Get exam ID from all possible sources with fallbacks
    const examId = selectedExam?._id || activeExamId || sessionStorage.getItem('activeExamId');
    
    if (!examId) {
      console.error("Cannot submit exam: No exam selected or invalid exam ID");
      toast.error("Cannot submit exam: Invalid exam data");
      return;
    }

    try {
      // Save the current answer first if we have a selectedExam
      if (selectedExam && currentQuestionIndex >= 0 && 
          selectedExam.questions && selectedExam.questions[currentQuestionIndex]) {
        const currentQuestion = selectedExam.questions[currentQuestionIndex];
        if (currentQuestion) {
          await saveAnswer(currentQuestion._id, answers[currentQuestion._id] || '');
          // Wait a moment to ensure the answer is saved
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Confirm submission unless time is up
      if (timeLeft > 0 && !window.confirm('Are you sure you want to submit your exam? This cannot be undone.')) {
        return;
      }
      
      toast.loading('Submitting exam...');
      
      console.log(`Submitting exam ${examId} for student ${userData.enrollmentNo}`);
      
      // Increase timeout and add more robust error handling
      const response = await axios.post(
        `${baseApiURL()}/online-exam/${examId}/submit`,
        { 
          enrollmentNo: userData.enrollmentNo,
          answers: Object.entries(answers).map(([questionId, answer]) => ({ 
            questionId, 
            answer 
          }))
        },
        { 
          headers: { 'Content-Type': 'application/json' },
          timeout: 60000 // Increased to 60 seconds timeout for large exams
        }
      );
      
      toast.dismiss();
      
      if (response.data.success) {
        toast.success('Exam submitted successfully!');
        
        // Stop the timer
        if (timerInterval) {
          clearInterval(timerInterval);
          setTimerIntervalRef(null);
        }
        
        // Clean up session storage
        sessionStorage.removeItem('activeExamId');
        
        // Fetch results if auto-evaluated
        if (!response.data.requiresManualEvaluation) {
          fetchExamResults(examId);
        } else {
          setView('list');
          fetchAvailableExams();
        }
      } else {
        toast.error(response.data.message || 'Failed to submit exam');
      }
    } catch (error) {
      toast.dismiss();
      console.error('Error submitting exam:', error);
      
      // Enhanced error message with more details
      let errorMessage = 'Failed to submit exam. Please try again.';
      
      if (error.response) {
        errorMessage = `Failed to submit exam: ${error.response.data?.message || error.response.status}`;
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'Server did not respond. Your network connection might be unstable.';
      }
      
      toast.error(errorMessage);
      
      // Always offer retry option
      setTimeout(() => {
        if (window.confirm('Would you like to try submitting again?')) {
          handleSubmitExam();
        }
      }, 1000);
    }
  };
  
  // Format remaining time as MM:SS
  const formatTime = (seconds) => {
    if (!seconds && seconds !== 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Fetch exam results
  const fetchExamResults = async (providedExamId) => {
    try {
      // Use provided exam ID, or try to get it from state or sessionStorage
      const examId = providedExamId || selectedExam?._id || activeExamId || sessionStorage.getItem('activeExamId');
      
      if (!examId) {
        console.error("Cannot fetch results: No exam selected or invalid exam ID");
        toast.error("Cannot fetch exam results: Invalid exam data");
        setView('list');
        return;
      }

      console.log(`Fetching results for exam ${examId} and student ${userData.enrollmentNo}`);
      
      const response = await axios.get(
        `${baseApiURL()}/online-exam/${examId}/result?enrollmentNo=${userData.enrollmentNo}`
      );
      
      if (response.data.success) {
        setExamResult(response.data.result);
        setView('results');
      } else {
        toast.error(response.data.message);
        setView('list');
      }
    } catch (error) {
      console.error('Error fetching results:', error);
      toast.error('Failed to load results. Please check later.');
      setView('list');
    }
  };
  
  // View exam results
  const handleViewResults = async (examId) => {
    try {
      toast.loading('Loading results...');
      
      const examResponse = await axios.get(`${baseApiURL()}/online-exam/${examId}`);
      if (!examResponse.data.success) {
        toast.dismiss();
        toast.error('Failed to load exam details');
        return;
      }
      
      setSelectedExam(examResponse.data.exam);
      
      const response = await axios.get(
        `${baseApiURL()}/online-exam/${examId}/result?enrollmentNo=${userData.enrollmentNo}`
      );
      
      toast.dismiss();
      
      if (response.data.success) {
        setExamResult(response.data.result);
        setView('results');
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.dismiss();
      console.error('Error fetching results:', error);
      toast.error('Failed to load results');
    }
  };
  
  return (
    <div className="w-full mx-auto flex justify-center items-start flex-col mb-10">
      <Heading title="Online Exams" />
      
      {/* Available Exams List */}
      {view === 'list' && (
        <div className="w-full mt-6">
          {loading ? (
            <p className="text-center py-10">Loading exams...</p>
          ) : exams.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-md">
              <p className="text-gray-500">No exams are currently available for you.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {exams.map((exam) => (
                <div key={exam._id} className="bg-white shadow-md rounded-lg p-5">
                  <div className="flex justify-between">
                    <h3 className="text-lg font-medium">{exam.name}</h3>
                    <div className="text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                      {exam.subject}
                    </div>
                  </div>
                  
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium">Start:</span> {formatDate(exam.startDate)}
                    </div>
                    <div>
                      <span className="font-medium">End:</span> {formatDate(exam.endDate)}
                    </div>
                    <div>
                      <span className="font-medium">Duration:</span> {exam.duration} minutes
                    </div>
                    <div>
                      <span className="font-medium">Total Marks:</span> {exam.totalMarks}
                    </div>
                  </div>
                  
                  <div className="mt-4 flex justify-end">
                    <button
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md"
                      onClick={() => handleStartExam(exam._id)}
                    >
                      {exam.status === 'ongoing' ? 'Continue Exam' : 'Start Exam'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Exam Instructions */}
      {view === 'instructions' && selectedExam && (
        <div className="w-full mt-6">
          <div className="flex items-center mb-6">
            <button 
              className="mr-4 text-blue-500 flex items-center"
              onClick={() => {
                if (timerInterval) {
                  clearInterval(timerInterval);
                }
                setView('list');
              }}
            >
              <FiArrowLeft className="mr-1" /> Back to Exams
            </button>
            <h2 className="text-xl font-medium">{selectedExam.name}</h2>
          </div>
          
          <div className="bg-white shadow-md rounded-lg p-6">
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3">Exam Instructions</h3>
              {selectedExam.instructions ? (
                <div className="bg-gray-50 p-4 rounded-md whitespace-pre-line">
                  {selectedExam.instructions}
                </div>
              ) : (
                <p className="text-gray-500 italic">No specific instructions provided.</p>
              )}
            </div>
            
            <div className="border-t border-gray-200 pt-4 mt-4">
              <h4 className="font-medium mb-3">Important Information:</h4>
              <ul className="list-disc ml-5 space-y-2 text-sm">
                <li>This exam has <span className="font-semibold">{selectedExam.questions.length}</span> questions worth a total of <span className="font-semibold">{selectedExam.totalMarks}</span> marks.</li>
                <li>You will have <span className="font-semibold">{selectedExam.duration} minutes</span> to complete the exam.</li>
                <li>Once started, the timer cannot be paused.</li>
                <li>Your answers are saved automatically when you navigate between questions.</li>
                <li>You can review and change your answers before submission.</li>
                <li>If you run out of time, your exam will be submitted automatically.</li>
              </ul>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md"
                onClick={() => {
                  // Ensure exam ID is consistently stored when moving from instructions to exam
                  if (selectedExam && selectedExam._id) {
                    sessionStorage.setItem('activeExamId', selectedExam._id);
                    setActiveExamId(selectedExam._id);
                  }
                  setView('exam');
                }}
              >
                Start Exam
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Exam Taking Interface */}
      {view === 'exam' && selectedExam && (
        <div className="w-full mt-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-medium">{selectedExam.name}</h2>
            <div className="flex items-center text-lg">
              <FiClock className="mr-2 text-red-500" />
              <div className={`font-mono ${timeLeft && timeLeft < 300 ? 'text-red-500 font-bold' : ''}`}>
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Question Navigator */}
            <div className="bg-white shadow-md rounded-lg p-4 order-2 lg:order-1">
              <h3 className="text-md font-medium mb-3">Questions</h3>
              <div className="flex flex-wrap gap-2">
                {selectedExam.questions.map((q, index) => (
                  <button
                    key={q._id}
                    className={`w-10 h-10 rounded-md flex items-center justify-center ${
                      currentQuestionIndex === index
                        ? 'bg-blue-500 text-white'
                        : answers[q._id]
                        ? 'bg-green-100 border border-green-400'
                        : 'bg-gray-100 border border-gray-300'
                    }`}
                    onClick={() => {
                      // Save current answer before changing question
                      const currQuestion = selectedExam.questions[currentQuestionIndex];
                      if (currQuestion) {
                        saveAnswer(currQuestion._id, answers[currQuestion._id] || '');
                      }
                      setCurrentQuestionIndex(index);
                    }}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
              
              <div className="mt-6">
                <p className="text-sm text-gray-600 mb-2">Legend:</p>
                <div className="flex items-center text-sm mb-1">
                  <div className="w-4 h-4 bg-blue-500 rounded-sm mr-2"></div>
                  Current Question
                </div>
                <div className="flex items-center text-sm mb-1">
                  <div className="w-4 h-4 bg-green-100 border border-green-400 rounded-sm mr-2"></div>
                  Answered
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded-sm mr-2"></div>
                  Not Answered
                </div>
              </div>
              
              <div className="mt-8">
                <button
                  className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md"
                  onClick={() => {
                    // Double-check that we have a valid exam ID before submitting
                    const examContext = sessionStorage.getItem('examContext');
                    if (examContext) {
                      try {
                        const parsedContext = JSON.parse(examContext);
                        if (parsedContext.examId && parsedContext.examId !== activeExamId) {
                          // Update active exam ID if needed from stored context
                          setActiveExamId(parsedContext.examId);
                        }
                      } catch (err) {
                        console.warn('Failed to parse exam context:', err);
                      }
                    }
                    
                    handleSubmitExam();
                  }}
                >
                  Submit Exam
                </button>
              </div>
            </div>
            
            {/* Question and Answer Area */}
            <div className="bg-white shadow-md rounded-lg p-6 lg:col-span-3 order-1 lg:order-2">
              {selectedExam.questions.length > 0 && selectedExam.questions[currentQuestionIndex] && (
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-medium">
                      Question {currentQuestionIndex + 1} of {selectedExam.questions.length}
                    </h3>
                    <div className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      {selectedExam.questions[currentQuestionIndex].marks} marks
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <p className="text-lg mb-2">{selectedExam.questions[currentQuestionIndex].question}</p>
                    <p className="text-sm text-gray-600 capitalize">
                      Type: {selectedExam.questions[currentQuestionIndex].type.replace(/([A-Z])/g, ' $1').trim()}
                    </p>
                  </div>
                  
                  <div className="mt-4">
                    {/* MCQ Type */}
                    {selectedExam.questions[currentQuestionIndex].type === 'mcq' && (
                      <div className="space-y-3">
                        {selectedExam.questions[currentQuestionIndex].options.map((option, idx) => (
                          <div key={idx} className="flex items-center">
                            <input
                              type="radio"
                              id={`option-${idx}`}
                              name="mcq-answer"
                              value={option}
                              checked={answers[selectedExam.questions[currentQuestionIndex]._id] === option}
                              onChange={(e) => setAnswers({
                                ...answers,
                                [selectedExam.questions[currentQuestionIndex]._id]: e.target.value
                              })}
                              className="mr-2"
                            />
                            <label htmlFor={`option-${idx}`}>
                              {String.fromCharCode(97 + idx)}. {option}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* One Word or Fill in the Blanks Type */}
                    {['oneWord', 'fillBlank'].includes(selectedExam.questions[currentQuestionIndex].type) && (
                      <div>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Your answer"
                          value={answers[selectedExam.questions[currentQuestionIndex]._id] || ''}
                          onChange={(e) => setAnswers({
                            ...answers,
                            [selectedExam.questions[currentQuestionIndex]._id]: e.target.value
                          })}
                        />
                      </div>
                    )}
                    
                    {/* Short Answer Type */}
                    {selectedExam.questions[currentQuestionIndex].type === 'shortAnswer' && (
                      <div>
                        <textarea
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Your answer"
                          rows="4"
                          value={answers[selectedExam.questions[currentQuestionIndex]._id] || ''}
                          onChange={(e) => setAnswers({
                            ...answers,
                            [selectedExam.questions[currentQuestionIndex]._id]: e.target.value
                          })}
                        ></textarea>
                      </div>
                    )}
                    
                    {/* Long Answer Type */}
                    {selectedExam.questions[currentQuestionIndex].type === 'longAnswer' && (
                      <div>
                        <textarea
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Your answer"
                          rows="8"
                          value={answers[selectedExam.questions[currentQuestionIndex]._id] || ''}
                          onChange={(e) => setAnswers({
                            ...answers,
                            [selectedExam.questions[currentQuestionIndex]._id]: e.target.value
                          })}
                        ></textarea>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between mt-8">
                    <button
                      className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md flex items-center"
                      onClick={handlePrevQuestion}
                      disabled={currentQuestionIndex === 0}
                    >
                      Previous
                    </button>
                    
                    <button
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center"
                      onClick={handleNextQuestion}
                      disabled={currentQuestionIndex === selectedExam.questions.length - 1}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Exam Results */}
      {view === 'results' && examResult && (
        <div className="w-full mt-6">
          <div className="flex items-center mb-6">
            <button 
              className="mr-4 text-blue-500 flex items-center"
              onClick={() => {
                setView('list');
                setExamResult(null);
              }}
            >
              <FiArrowLeft className="mr-1" /> Back to Exams
            </button>
            <h2 className="text-xl font-medium">Exam Results</h2>
          </div>
          
          <div className="bg-white shadow-md rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium mb-4">{examResult.examName}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm"><span className="font-medium">Subject:</span> {examResult.subject}</p>
                <p className="text-sm"><span className="font-medium">Submitted On:</span> {formatDate(examResult.submittedOn)}</p>
              </div>
              <div>
                <div className={`text-right text-lg font-bold ${examResult.passed ? 'text-green-600' : 'text-red-600'}`}>
                  {examResult.passed ? 'PASSED' : 'FAILED'}
                </div>
                <div className="text-right text-3xl font-bold">
                  {examResult.totalMarks} / {examResult.maxMarks}
                </div>
                <div className="text-right text-lg">
                  {examResult.percentage}%
                </div>
              </div>
            </div>
            
            <div className="mt-8">
              <h4 className="font-medium mb-4">Question Analysis</h4>
              <div className="space-y-5">
                {examResult.questions.map((q, index) => (
                  <div key={q.questionId} className="border-b border-gray-200 pb-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium">Question {index + 1}</div>
                      <div className={`text-sm ${q.isCorrect ? 'text-green-600' : 'text-red-600'} font-medium`}>
                        {q.awardedMarks} / {q.maxMarks} marks
                      </div>
                    </div>
                    
                    <p className="mb-2">{q.question}</p>
                    
                    {/* Display MCQ options with correct answer highlighted */}
                    {q.type === 'mcq' && q.options.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                        {q.options.map((opt, i) => (
                          <div key={i} className={`text-sm p-1 px-3 rounded ${
                            opt === q.correctAnswer
                              ? 'bg-green-50 border border-green-200'
                              : opt === q.studentAnswer
                              ? 'bg-red-50 border border-red-200'
                              : 'bg-gray-50'
                          }`}>
                            {String.fromCharCode(97 + i)}. {opt}
                            {opt === q.correctAnswer && (
                              <span className="ml-2 text-green-500">✓</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* For non-MCQ questions */}
                    {q.type !== 'mcq' && (
                      <>
                        <div className="mb-2">
                          <span className="font-medium">Your Answer: </span>
                          <span className={q.isCorrect ? 'text-green-600' : 'text-red-600'}>
                            {q.studentAnswer || '(No answer provided)'}
                          </span>
                        </div>
                        
                        {(['oneWord', 'fillBlank'].includes(q.type) && q.correctAnswer) && (
                          <div className="text-green-600">
                            <span className="font-medium">Correct Answer: </span>
                            {q.correctAnswer}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnlineExam;