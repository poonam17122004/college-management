import axios from "axios";
import React, { useEffect, useState } from "react";
import Heading from "../../components/Heading";
import toast from "react-hot-toast";
import { BiArrowBack } from "react-icons/bi";
import { baseApiURL } from "../../baseUrl";

const Attendance = () => {
  const [branch, setBranch] = useState();
  const [attendanceData, setAttendanceData] = useState([]);
  const [studentData, setStudentData] = useState();
  const [selected, setSelected] = useState({
    branch: "",
    semester: "",
    date: "",
  });

  const handleInputChange = (enrollmentNo, type, value) => {
    setAttendanceData((prevData) =>
      prevData.map((student) =>
        student.enrollmentNo === enrollmentNo
          ? { ...student, [type]: value }
          : student
      )
    );
  };

  const loadStudentDetails = () => {
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
        if (response.data.success) {
          setStudentData(response.data.user);
        } else {
          toast.error(response.data.message);
        }
        console.log(studentData);
      })
      .catch((error) => {
        console.error(error);
        toast.error(error.message);
      });
  };

  useEffect(() => {
    if (studentData) {
      const newAttendanceData = studentData.map((student) => ({
        enrollmentNo: student.enrollmentNo,
        presentDays: "",
        totalDays: "",
      }));
      setAttendanceData(newAttendanceData);
    }
  }, [studentData]);

  const submitAttendanceHandler = async () => {
    // console.log(attendanceData);

    try {
      const headers = {
        "Content-Type": "application/json",
      };
      const response = await axios.post(
        `${baseApiURL()}/attendance/addattendance`,
        { attendanceData },
        { headers }
      );

      // console.log(response);

      if (response.data === "Attendance updated successfully.") {
        toast.dismiss();
        toast.success(response.data);
      } else {
        toast.dismiss();
        toast.error(response.data);
      }
    } catch (error) {
      console.error("Error uploading attendance:", error);
      alert("Failed to upload attendance.");
    }
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

  useEffect(() => {
    getBranchData();
  }, []);

  const resetValueHandler = () => {
    setStudentData();
  };

  return (
    <div className="w-full mx-auto flex justify-center items-start flex-col my-10">
      <div className="relative flex justify-between items-center w-full">
        <Heading title={"Upload Attendance"} />
        {studentData && (
          <button
            className="absolute right-2 flex justify-center items-center border-2 border-red-500 px-3 py-2 rounded text-red-500"
            onClick={resetValueHandler}
          >
            <span className="mr-2">
              <BiArrowBack className="text-red-500" />
            </span>
            Close
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
              <label htmlFor="date" className="leading-7 text-base ">
                Select Date
              </label>
              <input
                type="date"
                id="date"
                className="px-2 bg-blue-50 py-3 rounded-sm text-base w-full accent-blue-700 mt-1"
                value={selected.date}
                onChange={(e) =>
                  setSelected({ ...selected, date: e.target.value })
                }
              />
            </div>
          </div>
          <button
            className="bg-blue-50 px-4 py-2 mt-8 mx-auto rounded border-2 border-blue-500 text-black"
            onClick={loadStudentDetails}
          >
            Load Student Data
          </button>
        </>
      )}
      {studentData && studentData.length !== 0 && (
        <>
          <p className="mt-4 text-lg">
            Mark Attendance for {selected.branch} Semester {selected.semester}{" "}
            on {new Date().toISOString().split("T")[0]}
          </p>
          <div
            className="w-full flex flex-wrap justify-center items-center mt-8 gap-4"
            id="attendanceContainer"
          >
            {studentData.map((student) => (
              <div
                key={student.enrollmentNo}
                className="w-[30%] flex flex-col justify-between items-center border-2 border-blue-500 rounded p-4"
                id={student.enrollmentNo}
              >
                <p className="text-lg w-full text-center bg-blue-50 py-1">
                  Roll No: {student.enrollmentNo}
                </p>
                <input
                  type="number"
                  className="px-4 py-2 focus:ring-0 outline-none w-full mt-2"
                  placeholder="Present Days"
                  onChange={(e) =>
                    handleInputChange(
                      student.enrollmentNo,
                      "presentDays",
                      e.target.value
                    )
                  }
                />
                <input
                  type="number"
                  className="px-4 py-2 focus:ring-0 outline-none w-full mt-2"
                  placeholder="Total Days"
                  onChange={(e) =>
                    handleInputChange(
                      student.enrollmentNo,
                      "totalDays",
                      e.target.value
                    )
                  }
                />
              </div>
            ))}
          </div>
          <button
            className="bg-blue-500 px-6 py-3 mt-8 mx-auto rounded text-white"
            onClick={submitAttendanceHandler}
          >
            Upload Attendance
          </button>
        </>
      )}
    </div>
  );
};

export default Attendance;
