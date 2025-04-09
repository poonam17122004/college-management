// import axios from "axios";
import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useSelector } from "react-redux";
import Heading from "../../components/Heading";
import { baseApiURL } from "../../baseUrl";

const Attendance = () => {
  const userData = useSelector((state) => state.userData);
  const [attendanceData, setAttendanceData] = useState();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          `${baseApiURL()}/attendance/getattendance?enrollmentNo=${
            userData.enrollmentNo
          }`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        const result = await response.json();
        // console.log(result);
        if (response.ok) {
          setAttendanceData(result.attendance);
        } else {
          toast.dismiss();
          console.error("Error fetching attendance:");
        }
      } catch (err) {
        console.log("Error fetching your attendance data ", err);
      }
    };
    fetchData();
  }, [userData.enrollmentNo]);

  return (
    <div className="w-full mx-auto mt-10 flex justify-center items-start flex-col mb-10">
      <Heading title={`Attendance for Semester ${userData.semester}`} />
      <div className="mt-14 w-full flex gap-20">
        {attendanceData ? (
          <div className="w-1/2 shadow-md p-4">
            <p className="border-b-2 border-red-500 text-2xl font-semibold pb-2">
              Attendance Details
            </p>
            <div className="mt-5">
              <div className="flex justify-between items-center w-full text-lg mt-2">
                <p className="w-full">Present Days</p>
                <span>{attendanceData.present}</span>
              </div>
              <div className="flex justify-between items-center w-full text-lg mt-2">
                <p className="w-full">Total Days</p>
                <span>{attendanceData.total}</span>
              </div>
              <div className="flex justify-between items-center w-full text-lg mt-2">
                <p className="w-full">Attendance Percentage</p>
                <span>
                  {(
                    (attendanceData.present / attendanceData.total) *
                    100
                  ).toFixed(2)}
                  %
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p>No Attendance Data Available At The Moment!</p>
        )}
      </div>
    </div>
  );
};

export default Attendance;
