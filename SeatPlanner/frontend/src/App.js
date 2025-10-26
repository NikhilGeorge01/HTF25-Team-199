import React, { useState, useEffect } from "react";
import "./App.css";
import SeatingPlanEditor from "./SeatingPlanEditor";

function AddExamModal({ onClose, onAdd }) {
  const [formData, setFormData] = useState({
    subject_code: "",
    subject_name: "",
    date: "",
    duration: 180,
    session: "",
    branches: "",
  });
  const [error, setError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    // Format date for backend
    const dateTime = new Date(formData.date);
    dateTime.setHours(formData.session === "Morning" ? 9 : 14);
    dateTime.setMinutes(0);

    const examData = {
      ...formData,
      date: dateTime.toISOString().slice(0, 16),
    };

    fetch("http://localhost:5000/exams", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(examData),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          if (data.conflicts) {
            setError(
              `${data.error}: ${data.conflicts
                .map((c) => c.subject_name)
                .join(", ")}`
            );
          }
        } else {
          onAdd(data);
          onClose();
        }
      })
      .catch((error) => {
        console.error("Error adding exam:", error);
        setError("Failed to add exam");
      });
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Add New Exam</h2>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          <div className="form-group">
            <label>Subject Code:</label>
            <input
              type="text"
              value={formData.subject_code}
              onChange={(e) =>
                setFormData({ ...formData, subject_code: e.target.value })
              }
              required
            />
          </div>
          <div className="form-group">
            <label>Subject Name:</label>
            <input
              type="text"
              value={formData.subject_name}
              onChange={(e) =>
                setFormData({ ...formData, subject_name: e.target.value })
              }
              required
            />
          </div>
          <div className="form-group">
            <label>Date:</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              required
            />
          </div>
          <div className="form-group">
            <label>Duration (minutes):</label>
            <input
              type="number"
              value={formData.duration}
              onChange={(e) =>
                setFormData({ ...formData, duration: parseInt(e.target.value) })
              }
              required
              min="30"
              step="30"
            />
          </div>
          <div className="form-group">
            <label>Session:</label>
            <select
              value={formData.session}
              onChange={(e) =>
                setFormData({ ...formData, session: e.target.value })
              }
              required
            >
              <option value="">Select Session</option>
              <option value="Morning">Morning</option>
              <option value="Afternoon">Afternoon</option>
            </select>
          </div>
          <div className="form-group">
            <label>Branches (comma-separated):</label>
            <input
              type="text"
              value={formData.branches}
              onChange={(e) =>
                setFormData({ ...formData, branches: e.target.value })
              }
              required
              placeholder="CSE, IT, ECE"
            />
          </div>
          <div className="modal-actions">
            <button type="submit" className="btn btn-primary">
              Add Exam
            </button>
            <button type="button" className="btn btn-danger" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddStudentModal({ onClose, onAdd }) {
  const [formData, setFormData] = useState({
    roll_number: "",
    name: "",
    course: "",
    semester: "",
  });
  const [error, setError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    fetch("http://localhost:5000/students", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to add student");
        }
        return response.json();
      })
      .then((data) => {
        onAdd(data);
        onClose();
      })
      .catch((error) => {
        console.error("Error adding student:", error);
        setError("Failed to add student");
      });
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Add New Student</h2>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          <div className="form-group">
            <label>Roll Number:</label>
            <input
              type="text"
              value={formData.roll_number}
              onChange={(e) =>
                setFormData({ ...formData, roll_number: e.target.value })
              }
              required
              placeholder="e.g., 2023001"
            />
          </div>
          <div className="form-group">
            <label>Name:</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>
          <div className="form-group">
            <label>Course:</label>
            <input
              type="text"
              value={formData.course}
              onChange={(e) =>
                setFormData({ ...formData, course: e.target.value })
              }
              required
              placeholder="e.g., CSE, IT, ECE"
            />
          </div>
          <div className="form-group">
            <label>Semester:</label>
            <select
              value={formData.semester}
              onChange={(e) =>
                setFormData({ ...formData, semester: parseInt(e.target.value) })
              }
              required
            >
              <option value="">Select Semester</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
          </div>
          <div className="modal-actions">
            <button type="submit" className="btn btn-primary">
              Add Student
            </button>
            <button type="button" className="btn btn-danger" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddRoomModal({ onClose }) {
  const [formData, setFormData] = useState({
    name: "",
    capacity: "",
    rows: "",
    columns: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    fetch("http://localhost:5000/rooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...formData,
        capacity: parseInt(formData.capacity),
        rows: parseInt(formData.rows),
        columns: parseInt(formData.columns),
      }),
    })
      .then((response) => response.json())
      .then(() => {
        onClose();
      })
      .catch((error) => console.error("Error adding room:", error));
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Add New Room</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Room Name:</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>
          <div className="form-group">
            <label>Capacity:</label>
            <input
              type="number"
              value={formData.capacity}
              onChange={(e) =>
                setFormData({ ...formData, capacity: e.target.value })
              }
              required
            />
          </div>
          <div className="form-group">
            <label>Rows:</label>
            <input
              type="number"
              value={formData.rows}
              onChange={(e) =>
                setFormData({ ...formData, rows: e.target.value })
              }
              required
            />
          </div>
          <div className="form-group">
            <label>Columns:</label>
            <input
              type="number"
              value={formData.columns}
              onChange={(e) =>
                setFormData({ ...formData, columns: e.target.value })
              }
              required
            />
          </div>
          <div className="modal-actions">
            <button type="submit" className="btn btn-primary">
              Add Room
            </button>
            <button type="button" className="btn btn-danger" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function App() {
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [showSeatingModal, setShowSeatingModal] = useState(false);
  const [showAddExamModal, setShowAddExamModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [activeTab, setActiveTab] = useState("exams");

  useEffect(() => {
    // Fetch exams
    fetch("http://localhost:5000/exams")
      .then((response) => response.json())
      .then((data) => setExams(data))
      .catch((error) => console.error("Error fetching exams:", error));

    // Fetch students
    fetch("http://localhost:5000/students")
      .then((response) => response.json())
      .then((data) => setStudents(data))
      .catch((error) => console.error("Error fetching students:", error));

    // Fetch rooms
    fetch("http://localhost:5000/classrooms")
      .then((response) => response.json())
      .then((data) => setRooms(data))
      .catch((error) => console.error("Error fetching rooms:", error));
  }, []);

  const handleAddExam = (newExam) => {
    setExams([...exams, newExam]);
  };

  return (
    <div className="App">
      <h1>Exam Seating Arrangement System</h1>

      <div className="management-buttons">
        <button
          className="btn btn-primary"
          onClick={() => setShowAddExamModal(true)}
        >
          Add Exam
        </button>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddStudentModal(true)}
        >
          Add Student
        </button>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddRoomModal(true)}
        >
          Add Room
        </button>
      </div>

      <div className="tabs">
        <button
          className={`tab-button ${activeTab === "exams" ? "active" : ""}`}
          onClick={() => setActiveTab("exams")}
        >
          Exams
        </button>
        <button
          className={`tab-button ${activeTab === "students" ? "active" : ""}`}
          onClick={() => setActiveTab("students")}
        >
          Students
        </button>
        <button
          className={`tab-button ${activeTab === "rooms" ? "active" : ""}`}
          onClick={() => setActiveTab("rooms")}
        >
          Rooms
        </button>
      </div>

      {showAddExamModal && (
        <AddExamModal
          onClose={() => setShowAddExamModal(false)}
          onAdd={handleAddExam}
        />
      )}

      {showAddStudentModal && (
        <AddStudentModal
          onClose={() => setShowAddStudentModal(false)}
          onAdd={(newStudent) => setStudents([...students, newStudent])}
        />
      )}

      {showAddRoomModal && (
        <AddRoomModal
          onClose={() => setShowAddRoomModal(false)}
          onAdd={(newRoom) => setRooms([...rooms, newRoom])}
        />
      )}

      {showSeatingModal && selectedExam && (
        <SeatingModal
          examId={selectedExam.id}
          onClose={() => setShowSeatingModal(false)}
        />
      )}

      {activeTab === "exams" && (
        <div className="exams-list">
          {exams.map((exam) => (
            <div key={exam.id} className="exam-item">
              <h3>{exam.subject_name}</h3>
              <p>Date: {new Date(exam.date).toLocaleDateString()}</p>
              <p>Session: {exam.session}</p>
              <button
                onClick={() => {
                  setSelectedExam(exam);
                  setShowSeatingModal(true);
                }}
                className="btn btn-primary"
              >
                View/Edit Seating
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === "students" && (
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>Roll Number</th>
                <th>Name</th>
                <th>Course</th>
                <th>Semester</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id}>
                  <td>{student.roll_number}</td>
                  <td>{student.name}</td>
                  <td>{student.course}</td>
                  <td>{student.semester}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "rooms" && (
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>Room Name</th>
                <th>Capacity</th>
                <th>Rows</th>
                <th>Columns</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id}>
                  <td>{room.name}</td>
                  <td>{room.capacity}</td>
                  <td>{room.rows}</td>
                  <td>{room.columns}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SeatingModal({ examId, onClose }) {
  const [seatingData, setSeatingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:5000/seating-plan/${examId}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setSeatingData(data);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching seating plan:", error);
        setError("Failed to load seating plan");
        setLoading(false);
      });
  }, [examId]);

  const handlePrint = () => {
    window.print();
  };

  const handleAutoAllocate = () => {
    setLoading(true);
    fetch(`http://localhost:5000/generate-seating/${examId}`, {
      method: "POST",
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          // Refresh the seating data after auto-allocation
          return fetch(`http://localhost:5000/seating-plan/${examId}`);
        }
      })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setSeatingData(data);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error in auto allocation:", error);
        setError("Failed to auto-allocate seats");
        setLoading(false);
      });
  };

  if (loading) {
    return (
      <div className="modal">
        <div className="modal-content">
          <div className="loading">Loading seating arrangement...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modal">
        <div className="modal-content">
          <div className="error">{error}</div>
          <button className="btn btn-danger" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!seatingData) {
    return (
      <div className="modal">
        <div className="modal-content">
          <div className="error">No seating arrangement found</div>
          <button className="btn btn-danger" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  }

  const getCourseColor = (course) => {
    if (!course) return "#f0f0f0";
    let hash = 0;
    for (let i = 0; i < course.length; i++) {
      hash = course.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    return `hsl(${h}, 70%, 90%)`;
  };

  // Collect unique courses for the legend
  const courses = new Set();
  seatingData.classrooms.forEach((classroom) => {
    classroom.seats.forEach((seat) => {
      if (seat.student?.course) {
        courses.add(seat.student.course);
      }
    });
  });

  return (
    <div className="modal">
      <div className="modal-content full-size">
        <div className="modal-header">
          <h2>{seatingData.exam_name}</h2>
          <div className="modal-actions">
            <button className="btn btn-success" onClick={handleAutoAllocate}>
              Auto Allocate Seats
            </button>
            <button className="btn btn-primary" onClick={handlePrint}>
              Print
            </button>
            <button className="btn btn-danger" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        <div className="course-legend">
          {Array.from(courses).map((course) => (
            <div key={course} className="course-item">
              <div
                className="color-box"
                style={{ backgroundColor: getCourseColor(course) }}
              ></div>
              <span>{course}</span>
            </div>
          ))}
        </div>
        <SeatingPlanEditor
          examId={examId}
          seatingData={seatingData}
          onClose={onClose}
          onSave={(updatedSeating) => {
            setSeatingData(updatedSeating);
          }}
          getCourseColor={getCourseColor}
        />
      </div>
    </div>
  );
}

export default App;
