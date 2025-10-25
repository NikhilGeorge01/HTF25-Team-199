import React, { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Typography,
  Box,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Chip,
} from "@mui/material";
import ExamCalendar from "../components/ExamCalendar";
import ManualSeating from "../components/ManualSeating";
import RoomView from "../components/RoomView";
import axios from "axios";

const AdminDashboard = () => {
  const [tabValue, setTabValue] = useState(0);
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [exams, setExams] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState("");
  const [formData, setFormData] = useState({});
  const [error, setError] = useState("");
  const [selectedExam, setSelectedExam] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchUsers();
    fetchRooms();
    fetchExams();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/rooms", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRooms(response.data);
    } catch (error) {
      console.error("Error fetching rooms:", error);
    }
  };

  const fetchExams = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/exams", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setExams(response.data);
    } catch (error) {
      console.error("Error fetching exams:", error);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleOpenDialog = (type, exam = null) => {
    setDialogType(type);
    setFormData({});
    setSelectedExam(exam);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError("");
    setSelectedExam(null);
    setFormData({});
  };

  const handleDeleteSchedule = async (examId, scheduleId) => {
    try {
      await axios.delete(
        `http://localhost:5000/api/exams/${examId}/schedule/${scheduleId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      fetchExams();
    } catch (error) {
      console.error("Error deleting schedule:", error);
      setError(error.response?.data?.error || "Error deleting schedule");
    }
  };

  const handleFormChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCsvUpload = async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post(
        "http://localhost:5000/api/upload-users",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setUploadStatus({
        success: response.data.errors.length === 0,
        message: `Upload complete: ${
          response.data.success.length
        } users created successfully. ${
          response.data.errors.length > 0
            ? `\nErrors: ${response.data.errors.join(", ")}`
            : ""
        }`,
      });

      // Refresh the users list
      fetchUsers();
    } catch (error) {
      setUploadStatus({
        success: false,
        message: `Upload failed: ${
          error.response?.data?.error || error.message
        }`,
      });
    }
  };

  const handleSubmit = async () => {
    try {
      if (dialogType === "user") {
        await axios.post("http://localhost:5000/api/users", formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchUsers();
      } else if (dialogType === "room") {
        await axios.post("http://localhost:5000/api/rooms", formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchRooms();
      } else if (dialogType === "exam") {
        await axios.post("http://localhost:5000/api/exams", formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchExams();
      } else if (dialogType === "schedule") {
        if (!selectedExam) {
          throw new Error("No exam selected");
        }
        // Make sure we have both required fields
        if (!formData.subjectCode || !formData.date) {
          throw new Error("Subject code and date are required");
        }
        await axios.post(
          `http://localhost:5000/api/exams/${selectedExam._id}/schedule`,
          formData,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        fetchExams();
        handleCloseDialog();
      }
      handleCloseDialog();
    } catch (error) {
      console.error("Submit error:", error);
      setError(
        error.response?.data?.error || error.message || "An error occurred"
      );
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Admin Dashboard
        </Typography>
        <Paper sx={{ width: "100%", mb: 2 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Users" />
            <Tab label="Rooms" />
            <Tab label="Seat Assignments" />
            <Tab label="Exams" />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {tabValue === 0 && (
              <>
                <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                  <Button
                    variant="contained"
                    onClick={() => handleOpenDialog("user")}
                  >
                    Add New User
                  </Button>
                  <Button
                    variant="contained"
                    component="label"
                    color="secondary"
                  >
                    Upload CSV
                    <input
                      type="file"
                      hidden
                      accept=".csv"
                      onChange={handleCsvUpload}
                    />
                  </Button>
                </Box>
                {uploadStatus && (
                  <Paper
                    sx={{
                      p: 2,
                      mb: 2,
                      bgcolor: uploadStatus.success
                        ? "success.light"
                        : "error.light",
                    }}
                  >
                    <Typography color="textPrimary">
                      {uploadStatus.message}
                    </Typography>
                  </Paper>
                )}
                <Grid container spacing={2}>
                  {users.map((user) => (
                    <Grid item xs={12} sm={6} md={4} key={user._id}>
                      <Paper sx={{ p: 2 }}>
                        <Typography variant="h6">{user.fullName}</Typography>
                        <Typography>Role: {user.role}</Typography>
                        <Typography>
                          {user.rollNumber || user.staffId || "Admin"}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </>
            )}

            {tabValue === 1 && (
              <>
                <Button
                  variant="contained"
                  onClick={() => handleOpenDialog("room")}
                  sx={{ mb: 2 }}
                >
                  Add New Room
                </Button>
                <Grid container spacing={2}>
                  {rooms.map((room) => (
                    <Grid item xs={12} sm={6} md={4} key={room._id}>
                      <Paper sx={{ p: 2 }}>
                        <Typography variant="h6">{room.name}</Typography>
                        <Typography>Capacity: {room.capacity}</Typography>
                        <Typography>Exam: {room.examName}</Typography>
                        <Typography>
                          Date: {new Date(room.examDate).toLocaleDateString()}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </>
            )}

            {tabValue === 2 && (
              <Box>
                <ManualSeating />
                <Box mt={4}>
                  <RoomView />
                </Box>
              </Box>
            )}

            {tabValue === 3 && (
              <>
                <Button
                  variant="contained"
                  onClick={() => handleOpenDialog("exam")}
                  sx={{ mb: 2 }}
                >
                  Create New Exam
                </Button>
                <Grid container spacing={2}>
                  {exams.map((exam) => (
                    <Grid item xs={12} key={exam._id}>
                      <Paper sx={{ p: 2 }}>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mb: 2,
                          }}
                        >
                          <Typography variant="h6">{exam.name}</Typography>
                          <Button
                            variant="outlined"
                            onClick={() => handleOpenDialog("schedule", exam)}
                          >
                            Add Subject
                          </Button>
                        </Box>
                        <Typography>
                          Duration:{" "}
                          {new Date(exam.startDate).toLocaleDateString()} -{" "}
                          {new Date(exam.endDate).toLocaleDateString()}
                        </Typography>
                        <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                          Exam Schedule:
                        </Typography>
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle1" gutterBottom>
                            Scheduled Subjects:
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1,
                              flexWrap: "wrap",
                              mb: 2,
                            }}
                          >
                            {exam.examSchedule.map((schedule) => (
                              <Chip
                                key={schedule._id}
                                label={`${schedule.subjectCode} - ${new Date(
                                  schedule.date
                                ).toLocaleDateString()}`}
                                onDelete={() =>
                                  handleDeleteSchedule(exam._id, schedule._id)
                                }
                              />
                            ))}
                          </Box>
                          <ExamCalendar exam={exam} />
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </>
            )}
          </Box>
        </Paper>

        <Dialog open={openDialog} onClose={handleCloseDialog}>
          <DialogTitle>
            {dialogType === "user" && "Add New User"}
            {dialogType === "room" && "Add New Room"}
            {dialogType === "exam" && "Create New Exam"}
            {dialogType === "schedule" && "Add Subject"}
          </DialogTitle>
          <DialogContent>
            {dialogType === "user" && (
              <>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="username"
                  label="Username"
                  onChange={handleFormChange}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type="password"
                  onChange={handleFormChange}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="fullName"
                  label="Full Name"
                  onChange={handleFormChange}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="role"
                  label="Role"
                  select
                  onChange={handleFormChange}
                >
                  <MenuItem value="student">Student</MenuItem>
                  <MenuItem value="staff">Staff</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </TextField>
                {formData.role === "student" && (
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    name="rollNumber"
                    label="Roll Number"
                    onChange={handleFormChange}
                  />
                )}
                {formData.role === "staff" && (
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    name="staffId"
                    label="Staff ID"
                    onChange={handleFormChange}
                  />
                )}
              </>
            )}

            {dialogType === "exam" && (
              <>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="name"
                  label="Exam Name"
                  onChange={handleFormChange}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="startDate"
                  label="Start Date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  onChange={handleFormChange}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="endDate"
                  label="End Date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  onChange={handleFormChange}
                />
              </>
            )}

            {dialogType === "schedule" && (
              <>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="subjectCode"
                  label="Subject Code"
                  onChange={handleFormChange}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="date"
                  label="Exam Date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  onChange={handleFormChange}
                />
              </>
            )}

            {dialogType === "room" && (
              <>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="name"
                  label="Room Name"
                  onChange={handleFormChange}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="capacity"
                  label="Capacity"
                  type="number"
                  onChange={handleFormChange}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="examName"
                  label="Exam Name"
                  onChange={handleFormChange}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="examDate"
                  label="Exam Date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  onChange={handleFormChange}
                />
              </>
            )}

            {error && (
              <Typography color="error" align="center" sx={{ mt: 2 }}>
                {error}
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit}>Create</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default AdminDashboard;
