import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Grid,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Snackbar,
  Alert,
} from '@mui/material';
import axios from 'axios';

const ManualSeating = () => {
  const [exams, setExams] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [seatNumber, setSeatNumber] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    if (selectedExam) {
      fetchRooms(selectedExam);
      fetchStudents();
    }
  }, [selectedExam]);

  const fetchExams = async () => {
    try {
      const response = await axios.get('/api/exams');
      setExams(response.data);
    } catch (error) {
      showSnackbar('Failed to fetch exams', 'error');
    }
  };

  const fetchRooms = async (examId) => {
    try {
      const response = await axios.get(`/api/rooms?examId=${examId}`);
      setRooms(response.data);
    } catch (error) {
      showSnackbar('Failed to fetch rooms', 'error');
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await axios.get('/api/users?role=student');
      setStudents(response.data);
    } catch (error) {
      showSnackbar('Failed to fetch students', 'error');
    }
  };

  const handleAssignSeat = async () => {
    try {
      await axios.put('/api/seats/manual-assign', {
        examId: selectedExam,
        roomId: selectedRoom,
        studentId: selectedStudent,
        seatNumber
      });
      showSnackbar('Seat assigned successfully', 'success');
      setSeatNumber('');
      setSelectedStudent('');
    } catch (error) {
      showSnackbar(error.response?.data?.error || 'Failed to assign seat', 'error');
    }
  };

  const handleClearSeat = async () => {
    try {
      await axios.put('/api/seats/manual-clear', {
        examId: selectedExam,
        roomId: selectedRoom,
        seatNumber
      });
      showSnackbar('Seat cleared successfully', 'success');
      setSeatNumber('');
    } catch (error) {
      showSnackbar(error.response?.data?.error || 'Failed to clear seat', 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box p={3}>
      <Paper elevation={3}>
        <Box p={3}>
          <Typography variant="h5" gutterBottom>
            Manual Seat Assignment
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Exam</InputLabel>
                <Select
                  value={selectedExam}
                  onChange={(e) => setSelectedExam(e.target.value)}
                  label="Exam"
                >
                  {exams.map((exam) => (
                    <MenuItem key={exam._id} value={exam._id}>
                      {exam.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Room</InputLabel>
                <Select
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  label="Room"
                  disabled={!selectedExam}
                >
                  {rooms.map((room) => (
                    <MenuItem key={room._id} value={room._id}>
                      {room.name} (Capacity: {room.capacity})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Student</InputLabel>
                <Select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  label="Student"
                  disabled={!selectedRoom}
                >
                  {students.map((student) => (
                    <MenuItem key={student._id} value={student._id}>
                      {student.rollNumber} - {student.fullName} ({student.branch})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Seat Number"
                value={seatNumber}
                onChange={(e) => setSeatNumber(e.target.value)}
                helperText="Format: A-01, B-15, etc."
              />
            </Grid>

            <Grid item xs={12}>
              <Box display="flex" gap={2}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleAssignSeat}
                  disabled={!selectedExam || !selectedRoom || !selectedStudent || !seatNumber}
                >
                  Assign Seat
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={handleClearSeat}
                  disabled={!selectedExam || !selectedRoom || !seatNumber}
                >
                  Clear Seat
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ManualSeating;