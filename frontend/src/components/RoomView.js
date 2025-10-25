import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  Snackbar,
  Alert,
} from '@mui/material';
import { Print as PrintIcon } from '@mui/icons-material';
import axios from 'axios';

const RoomView = () => {
  const [rooms, setRooms] = useState([]);
  const [exams, setExams] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [seatingData, setSeatingData] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    fetchRooms();
    fetchExams();
  }, []);

  useEffect(() => {
    if (selectedRoom && selectedExam) {
      fetchSeatingData();
    }
  }, [selectedRoom, selectedExam]);

  const fetchRooms = async () => {
    try {
      const response = await axios.get('/api/rooms');
      setRooms(response.data);
    } catch (error) {
      showSnackbar('Failed to fetch rooms', 'error');
    }
  };

  const fetchExams = async () => {
    try {
      const response = await axios.get('/api/exams');
      setExams(response.data);
    } catch (error) {
      showSnackbar('Failed to fetch exams', 'error');
    }
  };

  const fetchSeatingData = async () => {
    try {
      const response = await axios.get(`/api/seats/room/${selectedRoom}/seating?examId=${selectedExam}`);
      setSeatingData(response.data);
    } catch (error) {
      showSnackbar('Failed to fetch seating data', 'error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Get unique branch list for color coding
  const getBranchColor = (branch) => {
    const colors = {
      CSE: '#e3f2fd',
      ECE: '#f3e5f5',
      ME: '#e8f5e9',
      CIVIL: '#fff3e0',
    };
    return colors[branch] || '#ffffff';
  };

  return (
    <Box p={3}>
      <Paper elevation={3}>
        <Box p={3}>
          <Typography variant="h5" gutterBottom>
            Room-wise Seating Arrangement
          </Typography>

          <Box display="flex" gap={2} mb={3}>
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

            <FormControl fullWidth>
              <InputLabel>Room</InputLabel>
              <Select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                label="Room"
              >
                {rooms.map((room) => (
                  <MenuItem key={room._id} value={room._id}>
                    {room.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {seatingData && (
            <>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Room: {seatingData.roomNumber} | Exam: {seatingData.exam.subject}
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<PrintIcon />}
                  onClick={handlePrint}
                >
                  Print Seating Chart
                </Button>
              </Box>

              <TableContainer component={Paper} className="print-content">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Seat No</TableCell>
                      <TableCell>Roll No</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Branch</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {seatingData.students.map((student) => (
                      <TableRow
                        key={student.rollNo}
                        style={{ backgroundColor: getBranchColor(student.branch) }}
                      >
                        <TableCell>{student.seatNumber}</TableCell>
                        <TableCell>{student.rollNo}</TableCell>
                        <TableCell>{student.name}</TableCell>
                        <TableCell>{student.branch}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
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

export default RoomView;