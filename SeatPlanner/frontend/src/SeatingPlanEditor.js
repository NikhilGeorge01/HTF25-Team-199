import React, { useState, useEffect } from "react";
import "./SeatingPlanEditor.css";

function SeatingPlanEditor({
  examId,
  seatingData,
  onClose,
  onSave,
  readOnly = false,
}) {
  const [editedSeating, setEditedSeating] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [draggedStudent, setDraggedStudent] = useState(null);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeClassroom, setActiveClassroom] = useState(0);

  useEffect(() => {
    if (seatingData) {
      setEditedSeating(JSON.parse(JSON.stringify(seatingData))); // Deep copy
      // Get all assigned students
      const assignedStudents = new Set(
        seatingData.classrooms.flatMap((c) =>
          c.seats.filter((s) => s.student).map((s) => s.student.id)
        )
      );

      // Fetch available students for this exam
      fetch(`http://localhost:5000/available-students/${examId}`)
        .then((res) => res.json())
        .then((data) => {
          setAvailableStudents(data.filter((s) => !assignedStudents.has(s.id)));
        });
    }
  }, [seatingData, examId]);

  const handleDragStart = (student, fromSeat) => {
    setDraggedStudent({ student, fromSeat });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (toClassroom, toRow, toCol) => {
    if (!draggedStudent) return;

    const newSeating = { ...editedSeating };
    const classroom = newSeating.classrooms[toClassroom];

    // Remove student from old position if they were in a seat
    if (draggedStudent.fromSeat) {
      const {
        classroom: fromClassroom,
        row: fromRow,
        col: fromCol,
      } = draggedStudent.fromSeat;
      newSeating.classrooms[fromClassroom].seats = newSeating.classrooms[
        fromClassroom
      ].seats.map((seat) => {
        if (seat.row === fromRow && seat.column === fromCol) {
          return { ...seat, student: null };
        }
        return seat;
      });
    } else {
      // Remove from available students if coming from the sidebar
      setAvailableStudents((prev) =>
        prev.filter((s) => s.id !== draggedStudent.student.id)
      );
    }

    // Add student to new position
    const existingSeatIndex = classroom.seats.findIndex(
      (seat) => seat.row === toRow && seat.column === toCol
    );

    if (existingSeatIndex !== -1) {
      // If there's a student in the target seat, swap them
      const existingStudent = classroom.seats[existingSeatIndex].student;
      if (existingStudent) {
        setAvailableStudents((prev) => [...prev, existingStudent]);
      }

      classroom.seats[existingSeatIndex] = {
        ...classroom.seats[existingSeatIndex],
        student: draggedStudent.student,
      };
    } else {
      // Add new seat
      classroom.seats.push({
        row: toRow,
        column: toCol,
        student: draggedStudent.student,
      });
    }

    setEditedSeating(newSeating);
    setDraggedStudent(null);
  };

  const handleSave = async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/update-seating/${examId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(editedSeating),
        }
      );

      if (response.ok) {
        onSave && onSave(editedSeating);
        alert("Seating arrangement updated successfully!");
      } else {
        alert("Failed to update seating arrangement");
      }
    } catch (error) {
      console.error("Error updating seating:", error);
      alert("Error updating seating arrangement");
    }
  };

  const filteredStudents = availableStudents.filter(
    (student) =>
      student.roll_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.course.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!editedSeating) return <div>Loading...</div>;

  return (
    <div className="seating-editor">
      <div className="editor-sidebar">
        <div className="sidebar-section">
          <h3>Available Students</h3>
          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <div className="available-students">
            {filteredStudents.map((student) => (
              <div
                key={student.id}
                className="student-item"
                draggable={!readOnly}
                onDragStart={() => handleDragStart(student, null)}
              >
                <div>{student.roll_number}</div>
                <div>{student.name}</div>
                <div className="student-course">{student.course}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="editor-main">
        <div className="classroom-tabs">
          {editedSeating.classrooms.map((classroom, index) => (
            <button
              key={index}
              className={`tab-button ${
                activeClassroom === index ? "active" : ""
              }`}
              onClick={() => setActiveClassroom(index)}
            >
              {classroom.classroom_name}
            </button>
          ))}
        </div>

        <div className="classroom-grid">
          {Array.from({
            length: editedSeating.classrooms[activeClassroom].rows,
          }).map((_, row) => (
            <div key={row} className="grid-row">
              {Array.from({
                length: editedSeating.classrooms[activeClassroom].columns,
              }).map((_, col) => {
                const seat = editedSeating.classrooms[
                  activeClassroom
                ].seats.find((s) => s.row === row + 1 && s.column === col + 1);
                return (
                  <div
                    key={`${row}-${col}`}
                    className={`grid-cell ${seat?.student ? "occupied" : ""}`}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(activeClassroom, row + 1, col + 1)}
                  >
                    {seat?.student && (
                      <div
                        className="seated-student"
                        draggable={!readOnly}
                        onDragStart={() =>
                          handleDragStart(seat.student, {
                            classroom: activeClassroom,
                            row: row + 1,
                            col: col + 1,
                          })
                        }
                      >
                        <div>{seat.student.roll_number}</div>
                        <div>{seat.student.name}</div>
                        <div className="student-course">
                          {seat.student.course}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="editor-actions">
          {!readOnly && (
            <button onClick={handleSave} className="save-button">
              Save Changes
            </button>
          )}
          <button onClick={onClose} className="close-button">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default SeatingPlanEditor;
