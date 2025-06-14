import axios from "axios";
import React, { useEffect, useState, useRef } from "react";
import Heading from "../../components/Heading";
import toast from "react-hot-toast";
import { BiArrowBack, BiImport, BiExport } from "react-icons/bi";
import { baseApiURL } from "../../baseUrl";
import { CSVLink } from "react-csv";
import Papa from "papaparse";

const Marks = () => {
  const [subject, setSubject] = useState();
  const [branch, setBranch] = useState();
  const [studentData, setStudentData] = useState();
  
  const [selected, setSelected] = useState({
    branch: "",
    semester: "",
    subject: "",
    examType: "",
  });
  
  // Reference for file input
  const fileInputRef = useRef();

  // Get maximum marks based on exam type
  const getMaxMarks = () => {
    return selected.examType === "internal" ? 40 : 60;
  };

  // New: fetch marks for students and merge into studentData
  const fetchAndMergeMarks = (students) => {
    if (!selected.branch || !selected.semester || !selected.subject || !selected.examType) return;
    axios
      .get(`${baseApiURL()}/marks/byParams`, {
        params: {
          branch: selected.branch,
          semester: selected.semester,
          subject: selected.subject,
          examType: selected.examType,
        },
      })
      .then((response) => {
        if (response.data.success && response.data.data) {
          // Merge marks into students
          const marksMap = {};
          response.data.data.forEach((item) => {
            marksMap[item.enrollmentNo] = item.marks;
          });
          setStudentData(
            students.map((s) => ({ ...s, marks: marksMap[s.enrollmentNo] ?? "" }))
          );
        } else {
          setStudentData(students.map((s) => ({ ...s, marks: "" })));
        }
      })
      .catch(() => {
        setStudentData(students.map((s) => ({ ...s, marks: "" })));
      });
  };

  // Update loadStudentDetails to fetch marks after loading students
  const loadStudentDetails = () => {
    toast.loading("Loading student data");
    const headers = {
      "Content-Type": "application/json",
    };
    axios
      .post(
        `${baseApiURL()}/student/details/getDetails`,
        { branch: selected.branch, semester: selected.semester },
        { headers }
      )
      .then((response) => {
        toast.dismiss();
        if (response.data.success) {
          fetchAndMergeMarks(response.data.user);
        } else {
          toast.error(response.data.message);
        }
      })
      .catch((error) => {
        toast.dismiss();
        console.error(error);
        toast.error(error.message);
      });
  };

  const submitMarksHandler = () => {
    toast.loading("Uploading marks");
    if (!studentData || studentData.length === 0) {
      toast.dismiss();
      toast.error("No marks to upload");
      return;
    }
    let successCount = 0;
    let processed = 0;
    const maxMarks = getMaxMarks();
    const total = studentData.length;

    studentData.forEach((student) => {
      const marksInput = student.marks;
      if (marksInput !== undefined && marksInput !== "") {
        const markValue = Number(marksInput);
        if (isNaN(markValue) || markValue < 0 || markValue > maxMarks) {
          toast.error(`Marks for ${student.enrollmentNo} must be between 0 and ${maxMarks}`);
          processed++;
          if (processed === total) {
            toast.dismiss();
            toast.success(`Successfully uploaded ${successCount} of ${total} marks`);
          }
          return;
        }
        setStudentMarksHandler(
          student.enrollmentNo,
          marksInput,
          () => {
            successCount++;
            processed++;
            if (processed === total) {
              toast.dismiss();
              toast.success(`Successfully uploaded ${successCount} of ${total} marks`);
            }
          },
          () => {
            processed++;
            if (processed === total) {
              toast.dismiss();
              toast.success(`Successfully uploaded ${successCount} of ${total} marks`);
            }
          }
        );
      } else {
        processed++;
        if (processed === total) {
          toast.dismiss();
          toast.success(`Successfully uploaded ${successCount} of ${total} marks`);
        }
      }
    });
  };

  const setStudentMarksHandler = (enrollment, value, onSuccess, onError) => {
    const headers = {
      "Content-Type": "application/json",
    };
    axios
      .put(
        `${baseApiURL()}/marks/update/${enrollment}`,
        {
          subject: selected.subject,
          examType: selected.examType,
          marks: Number(value),
        },
        { headers }
      )
      .then((response) => {
        if (response.data.success) {
          if (onSuccess) onSuccess();
        } else {
          if (onError) onError();
        }
      })
      .catch((error) => {
        console.error(error);
        if (onError) onError();
      });
  };

  const getBranchData = () => {
    const headers = {
      "Content-Type": "application/json",
    };
    axios
      .get(`${baseApiURL()}/branch/getBranch`, { headers })
      .then((response) => {
        if (response.data.success) {
          setBranch(response.data.branches);
        } else {
          toast.error(response.data.message);
        }
      })
      .catch((error) => {
        console.error(error);
        toast.error(error.message);
      });
  };

  const getSubjectData = () => {
    toast.loading("Loading Subjects");
    axios
      .get(`${baseApiURL()}/subject/getSubject`)
      .then((response) => {
        toast.dismiss();
        if (response.data.success) {
          setSubject(response.data.subject);
        } else {
          toast.error(response.data.message);
        }
      })
      .catch((error) => {
        toast.dismiss();
        toast.error(error.message);
      });
  };

  useEffect(() => {
    getBranchData();
    getSubjectData();
  }, []);

  const resetValueHandler = () => {
    setStudentData(null);
    setSelected({
      branch: "",
      semester: "",
      subject: "",
      examType: "",
    });
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.type !== "text/csv" && !file.name.endsWith('.csv')) {
      toast.error("Please upload a valid CSV file");
      return;
    }
    
    toast.loading("Processing CSV file");
    const maxMarks = getMaxMarks();
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const { data, errors } = results;
        
        if (errors.length > 0) {
          toast.dismiss();
          toast.error("Error parsing CSV file");
          console.error("CSV parsing errors:", errors);
          return;
        }
        
        if (data.length === 0) {
          toast.dismiss();
          toast.error("No data found in CSV file");
          return;
        }
        
        // Validate and transform the data
        const students = data.map(row => {
          // Assume CSV has enrollmentNo and marks columns
          const enrollmentNo = row.enrollmentNo || row.EnrollmentNo;
          const marks = row.marks || row.Marks;
          
          if (!enrollmentNo || marks === undefined) {
            return { error: "Missing required fields" };
          }
          
          // Validate marks are within range
          const markValue = Number(marks);
          if (isNaN(markValue) || markValue < 0 || markValue > maxMarks) {
            return { error: `Invalid marks for ${enrollmentNo}: must be between 0 and ${maxMarks}` };
          }
          
          return { enrollmentNo, marks };
        });
        
        // Filter out invalid entries
        const invalidEntries = students.filter(s => s.error);
        if (invalidEntries.length > 0) {
          invalidEntries.forEach(entry => {
            console.error(entry.error);
          });
        }
        
        const validStudents = students.filter(s => !s.error);
        
        if (validStudents.length === 0) {
          toast.dismiss();
          toast.error("No valid student data found in CSV");
          return;
        }
        
        // Send the bulk upload request
        const headers = {
          "Content-Type": "application/json",
        };
        
        axios
          .post(
            `${baseApiURL()}/marks/bulkUpload`,
            {
              students: validStudents,
              subject: selected.subject,
              examType: selected.examType
            },
            { headers }
          )
          .then((response) => {
            toast.dismiss();
            if (response.data.success) {
              toast.success(response.data.message);
              // Clear the file input
              if (fileInputRef.current) {
                fileInputRef.current.value = "";
              }
            } else {
              toast.error(response.data.message || "Failed to upload marks");
            }
          })
          .catch((error) => {
            toast.dismiss();
            console.error("Bulk upload error:", error);
            toast.error("Failed to upload marks");
          });
      },
      error: (error) => {
        toast.dismiss();
        toast.error("Error reading CSV file");
        console.error("CSV reading error:", error);
      }
    });
  };

  const generateCSVTemplate = () => {
    if (!studentData || studentData.length === 0) {
      toast.error("Load student data first to generate template");
      return;
    }
    
    // Create CSV data
    const csvData = studentData.map(student => ({
      enrollmentNo: student.enrollmentNo,
      name: `${student.firstName} ${student.lastName}`,
      marks: ""
    }));
    
    return csvData;
  };

  // New: update marks for a single student
  // ...existing code...
const updateStudentMark = async (student) => {
  const markValue = Number(student.marks);
  const maxMarks = getMaxMarks();

  if (isNaN(markValue) || markValue < 0 || markValue > maxMarks) {
    toast.error(`Marks must be between 0 and ${maxMarks}`);
    return;
  }

  try {
    const response = await axios.put(
      `${baseApiURL()}/marks/update/${student.enrollmentNo}`,
      {
        subject: selected.subject,
        examType: selected.examType,
        marks: markValue,
      }
    );

    if (response.data && response.data.success) {
      toast.success("Marks updated");
      // Optionally, refresh marks here if needed
      // fetchAndMergeMarks(studentData);
    } else {
      toast.error(response.data?.message || "Failed to update marks");
    }
  } catch (error) {
    toast.error(
      error.response?.data?.message || "Failed to update marks"
    );
  }
};
// ...existing code...
  return (
    <div className="w-full mx-auto flex justify-center items-start flex-col my-10">
      <div className="relative flex justify-between items-center w-full">
        <Heading title={`Marks Management`} />
        {studentData && (
          <button
            className="absolute right-2 flex justify-center items-center border-2 border-red-500 px-3 py-2 rounded text-red-500"
            onClick={resetValueHandler}
          >
            <span className="mr-2">
              <BiArrowBack className="text-red-500" />
            </span>
            Back
          </button>
        )}
      </div>
      
      {!studentData && (
        <>
          <div className="mt-10 w-full flex justify-evenly items-center gap-x-6">
            <div className="w-full">
              <label htmlFor="branch" className="leading-7 text-base ">
                Select Branch
              </label>
              <select
                id="branch"
                className="px-2 bg-blue-50 py-3 rounded-sm text-base w-full accent-blue-700 mt-1"
                value={selected.branch}
                onChange={(e) =>
                  setSelected({ ...selected, branch: e.target.value })
                }
              >
                <option defaultValue>-- Select --</option>
                {branch &&
                  branch.map((branch) => {
                    return (
                      <option value={branch.name} key={branch.name}>
                        {branch.name}
                      </option>
                    );
                  })}
              </select>
            </div>
            <div className="w-full">
              <label htmlFor="semester" className="leading-7 text-base ">
                Select Semester
              </label>
              <select
                id="semester"
                className="px-2 bg-blue-50 py-3 rounded-sm text-base w-full accent-blue-700 mt-1"
                value={selected.semester}
                onChange={(e) =>
                  setSelected({ ...selected, semester: e.target.value })
                }
              >
                <option defaultValue>-- Select --</option>
                <option value="1">1st Semester</option>
                <option value="2">2nd Semester</option>
                <option value="3">3rd Semester</option>
                <option value="4">4th Semester</option>
                <option value="5">5th Semester</option>
                <option value="6">6th Semester</option>
                <option value="7">7th Semester</option>
                <option value="8">8th Semester</option>
              </select>
            </div>
            <div className="w-full">
              <label htmlFor="subject" className="leading-7 text-base ">
                Select Subject
              </label>
              <select
                id="subject"
                className="px-2 bg-blue-50 py-3 rounded-sm text-base w-full accent-blue-700 mt-1"
                value={selected.subject}
                onChange={(e) =>
                  setSelected({ ...selected, subject: e.target.value })
                }
              >
                <option defaultValue>-- Select --</option>
                {subject &&
                  subject.map((subject) => {
                    return (
                      <option value={subject.name} key={subject.name}>
                        {subject.name}
                      </option>
                    );
                  })}
              </select>
            </div>
            <div className="w-full">
              <label htmlFor="examType" className="leading-7 text-base ">
                Select Exam Type
              </label>
              <select
                id="examType"
                className="px-2 bg-blue-50 py-3 rounded-sm text-base w-full accent-blue-700 mt-1"
                value={selected.examType}
                onChange={(e) =>
                  setSelected({ ...selected, examType: e.target.value })
                }
              >
                <option defaultValue>-- Select --</option>
                <option value="internal">Internal</option>
                <option value="external">External</option>
              </select>
            </div>
          </div>

          <div className="mt-8 w-full flex justify-center items-center gap-4">
            <button
              className="bg-blue-500 px-6 py-3 rounded text-white flex items-center"
              onClick={loadStudentDetails}
              disabled={!selected.branch || !selected.semester || !selected.subject || !selected.examType}
            >
              <BiImport className="mr-2" />
              Upload Marks
            </button>
          </div>
        </>
      )}
      
      {studentData && studentData.length !== 0 && (
        <>
          <div className="w-full flex flex-col mt-4">
            <div className="mb-4 bg-blue-50 p-4 rounded-md">
              <p className="text-lg font-medium">
                Upload {selected.examType} Marks - {selected.branch} Semester {selected.semester} - {selected.subject}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Enter marks for each student (Maximum marks: {selected.examType === 'internal' ? '40' : '60'})
              </p>
            </div>
            
            <div className="border-t-2 border-gray-200 pt-4 mb-6">
              <p className="font-medium">Bulk Upload Options:</p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex-1 flex items-center gap-2">
                  <button 
                    className="bg-blue-100 border border-blue-500 text-blue-700 px-4 py-2 rounded flex items-center"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <BiImport className="mr-2" />
                    Import CSV
                  </button>
                  <input 
                    type="file" 
                    accept=".csv" 
                    ref={fileInputRef}
                    className="hidden" 
                    onChange={handleFileUpload}
                  />
                </div>
                
                {studentData && studentData.length > 0 && (
                  <CSVLink 
                    data={generateCSVTemplate()}
                    filename={`${selected.branch}_${selected.semester}_${selected.subject}_template.csv`}
                    className="bg-green-100 border border-green-500 text-green-700 px-4 py-2 rounded flex items-center"
                  >
                    <BiExport className="mr-2" />
                    Download Template
                  </CSVLink>
                )}
              </div>
            </div>
          </div>

          <div
            className="w-full flex flex-wrap justify-center items-center mt-4 gap-4"
            id="markContainer"
          >
            {studentData.map((student, idx) => {
              return (
                <div
                  key={student.enrollmentNo}
                  className="w-[30%] flex justify-between items-center border-2 border-blue-500 rounded mb-2"
                  id={student.enrollmentNo}
                >
                  <div className="px-4 py-3 w-1/2 bg-blue-50">
                    <p className="text-lg">{student.enrollmentNo}</p>
                    <p className="text-xs text-gray-600">
                      {student.firstName} {student.lastName}
                    </p>
                  </div>
                  <input
                    type="number"
                    className="px-6 py-2 focus:ring-0 outline-none w-1/2"
                    placeholder={`Marks (out of ${getMaxMarks()})`}
                    min="0"
                    max={getMaxMarks()}
                    value={student.marks}
                    onChange={e => {
                      const val = e.target.value;
                      setStudentData(prev => prev.map((s, i) => i === idx ? { ...s, marks: val } : s));
                    }}
                  />
                  <button
                    className="ml-2 bg-green-500 text-white px-3 py-2 rounded"
                    onClick={() => updateStudentMark(student)}
                    type="button"
                  >
                    Update
                  </button>
                </div>
              );
            })}
          </div>
          <button
            className="bg-blue-500 px-6 py-3 mt-8 mx-auto rounded text-white"
            onClick={submitMarksHandler}
          >
            Upload Student Marks
          </button>
        </>
      )}
    </div>
  );
};

export default Marks;
