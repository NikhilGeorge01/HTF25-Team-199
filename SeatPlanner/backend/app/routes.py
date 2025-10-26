from flask import Blueprint, jsonify, request
from datetime import datetime, timedelta
from sqlalchemy import text
from .models import db, Student, Classroom, Exam, SeatingArrangement
import random

main = Blueprint('main', __name__)

@main.route('/')
def index():
    return jsonify({'message': 'Welcome to the Exam Seating Arrangement System API'})

@main.route('/seating-plan/<int:exam_id>')
def get_seating_plan(exam_id):
    try:
        exam = Exam.query.get_or_404(exam_id)
        classrooms = Classroom.query.all()
        
        seating_data = {
            'exam_id': exam.id,
            'exam_name': f"{exam.subject_code} - {exam.subject_name}",
            'date': exam.date.strftime('%Y-%m-%d'),
            'time_slot': exam.session,
            'classrooms': []
        }
        
        for classroom in classrooms:
            arrangements = (SeatingArrangement.query
                          .filter_by(exam_id=exam_id, classroom_id=classroom.id)
                          .all())
            
            classroom_data = {
                'classroom_name': classroom.name,
                'rows': classroom.rows,
                'columns': classroom.columns,
                'seats': []
            }
            
            for arrangement in arrangements:
                student = Student.query.get(arrangement.student_id)
                classroom_data['seats'].append({
                    'row': arrangement.row_number,
                    'column': arrangement.column_number,
                    'student': student.to_dict() if student else None
                })
            
            seating_data['classrooms'].append(classroom_data)
        
        return jsonify(seating_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@main.route('/available-students/<int:exam_id>')
def get_available_students(exam_id):
    try:
        exam = Exam.query.get_or_404(exam_id)
        all_students = Student.query.filter(Student.course.in_(exam.branches.split(','))).all()
        
        # Get already assigned students
        assigned_students = set(
            db.session.query(SeatingArrangement.student_id)
            .filter(SeatingArrangement.exam_id == exam_id)
            .all()
        )
        
        # Filter out assigned students
        available_students = [
            student.to_dict() for student in all_students 
            if student.id not in assigned_students
        ]
        
        return jsonify(available_students)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@main.route('/update-seating/<int:exam_id>', methods=['POST'])
def update_seating(exam_id):
    try:
        data = request.get_json()
        exam = Exam.query.get_or_404(exam_id)

        # First, remove all existing seating arrangements for this exam
        SeatingArrangement.query.filter_by(exam_id=exam_id).delete()
        
        # Create new seating arrangements based on the provided data
        for classroom_data in data['classrooms']:
            classroom = Classroom.query.filter_by(name=classroom_data['classroom_name']).first()
            if not classroom:
                continue
                
            for seat in classroom_data['seats']:
                if seat.get('student'):
                    arrangement = SeatingArrangement(
                        exam_id=exam_id,
                        student_id=seat['student']['id'],
                        classroom_id=classroom.id,
                        row_number=seat['row'],
                        column_number=seat['column']
                    )
                    db.session.add(arrangement)
        
        db.session.commit()
        return jsonify({'message': 'Seating arrangement updated successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@main.route('/students', methods=['GET', 'POST'])
def handle_students():
    if request.method == 'POST':
        data = request.get_json()
        new_student = Student(
            roll_number=data['roll_number'],
            name=data['name'],
            course=data['course'],
            semester=data['semester']
        )
        db.session.add(new_student)
        db.session.commit()
        return jsonify({'message': 'Student added successfully'}), 201
    
    students = Student.query.all()
    return jsonify([{
        'id': s.id,
        'roll_number': s.roll_number,
        'name': s.name,
        'course': s.course,
        'semester': s.semester
    } for s in students])

@main.route('/classrooms', methods=['GET', 'POST'])
def handle_classrooms():
    if request.method == 'POST':
        data = request.get_json()
        new_classroom = Classroom(
            name=data['name'],
            capacity=data['capacity'],
            rows=data['rows'],
            columns=data['columns']
        )
        db.session.add(new_classroom)
        db.session.commit()
        return jsonify({'message': 'Classroom added successfully'}), 201
    
    classrooms = Classroom.query.all()
    return jsonify([{
        'id': c.id,
        'name': c.name,
        'capacity': c.capacity,
        'rows': c.rows,
        'columns': c.columns
    } for c in classrooms])

def check_exam_conflicts(exam_date, duration, session, branches, existing_exam_id=None):
    """Check for exam time conflicts"""
    new_start_time = exam_date
    new_end_time = new_start_time + timedelta(minutes=duration)
    
    # Convert branches string to set for easier comparison
    new_branches = set(branch.strip() for branch in branches.split(','))
    
    # Get all exams
    query = Exam.query
    if existing_exam_id:
        query = query.filter(Exam.id != existing_exam_id)
    all_exams = query.all()
    
    # Check for overlaps in Python
    overlapping_exams = []
    for exam in all_exams:
        exam_start = exam.date
        exam_end = exam_start + timedelta(minutes=exam.duration)
        exam_branches = set(branch.strip() for branch in exam.branches.split(','))
        
        # Check if there's an overlap in both time and branches
        if (new_start_time < exam_end and exam_start < new_end_time and
            exam.session == session and
            new_branches.intersection(exam_branches)):  # Check if any branches overlap
            overlapping_exams.append(exam)
    
    return overlapping_exams

@main.route('/exam-conflicts/<int:exam_id>', methods=['GET'])
def get_exam_conflicts(exam_id):
    exam = Exam.query.get_or_404(exam_id)
    
    # Find students with conflicts
    conflicts = []
    overlapping_exams = check_exam_conflicts(exam.date, exam.duration, exam.session, exam.id)
    
    for other_exam in overlapping_exams:
        # Find students scheduled for both exams
        conflicting_students = db.session.query(Student).\
            join(SeatingArrangement, Student.id == SeatingArrangement.student_id).\
            filter(SeatingArrangement.exam_id.in_([exam_id, other_exam.id])).\
            group_by(Student.id).\
            having(db.func.count(Student.id) > 1).\
            all()
        
        if conflicting_students:
            conflicts.append({
                'exam': {
                    'id': other_exam.id,
                    'subject_code': other_exam.subject_code,
                    'subject_name': other_exam.subject_name,
                    'date': other_exam.date.strftime('%Y-%m-%dT%H:%M'),
                    'duration': other_exam.duration,
                    'session': other_exam.session
                },
                'students': [{
                    'id': student.id,
                    'roll_number': student.roll_number,
                    'name': student.name,
                    'course': student.course
                } for student in conflicting_students]
            })
    
    return jsonify(conflicts)

@main.route('/exams', methods=['GET', 'POST'])
def handle_exams():
    if request.method == 'POST':
        data = request.get_json()
        # Handle ISO format date string from frontend
        date_str = data['date'].replace('T', ' ')
        exam_date = datetime.strptime(date_str, '%Y-%m-%d %H:%M')
        
        # Check for conflicts before creating the exam
        conflicts = check_exam_conflicts(
            exam_date, 
            data['duration'], 
            data['session'],
            data['branches']
        )
        
        if conflicts:
            return jsonify({
                'error': 'Exam time conflicts detected',
                'conflicts': [{
                    'subject_code': exam.subject_code,
                    'subject_name': exam.subject_name,
                    'date': exam.date.strftime('%Y-%m-%dT%H:%M'),
                    'duration': exam.duration,
                    'session': exam.session,
                    'branches': exam.branches
                } for exam in conflicts]
            }), 409  # HTTP 409 Conflict
        
        new_exam = Exam(
            subject_code=data['subject_code'],
            subject_name=data['subject_name'],
            date=exam_date,
            duration=data['duration'],
            session=data['session'],
            branches=data['branches']
        )
        db.session.add(new_exam)
        db.session.commit()
        return jsonify({'message': 'Exam added successfully'}), 201
    
    exams = Exam.query.all()
    return jsonify([{
        'id': e.id,
        'subject_code': e.subject_code,
        'subject_name': e.subject_name,
        'date': e.date.strftime('%Y-%m-%dT%H:%M'),  # Using ISO format with T separator
        'duration': e.duration,
        'session': e.session,
        'branches': e.branches
    } for e in exams])

def calculate_classroom_capacities(classrooms, total_students):
    """Calculate how many students should be in each classroom for uniform distribution"""
    total_capacity = sum(c.capacity for c in classrooms)
    distributions = {}
    remaining_students = total_students
    
    for classroom in classrooms:
        # Calculate proportional allocation
        allocation = int((classroom.capacity / total_capacity) * total_students)
        distributions[classroom.id] = min(allocation, remaining_students)
        remaining_students -= distributions[classroom.id]
    
    # Distribute any remaining students
    if remaining_students > 0:
        for classroom in classrooms:
            available_space = classroom.capacity - distributions[classroom.id]
            if available_space > 0:
                allocation = min(available_space, remaining_students)
                distributions[classroom.id] += allocation
                remaining_students -= allocation
                if remaining_students == 0:
                    break
    
    return distributions

def is_valid_seat(grid, row, col, course, spacing):
    """Check if a seat is valid considering course and spacing requirements"""
    rows = len(grid)
    cols = len(grid[0]) if rows > 0 else 0
    
    # Check surrounding seats within spacing distance
    for dx in range(-spacing, spacing + 1):
        for dy in range(-spacing, spacing + 1):
            if dx == 0 and dy == 0:
                continue
            new_row, new_col = row + dx, col + dy
            if (0 <= new_row < rows and 0 <= new_col < cols and 
                grid[new_row][new_col] is not None):
                # If it's the same course, require more distance
                if grid[new_row][new_col]['course'] == course:
                    if abs(dx) <= spacing and abs(dy) <= spacing:
                        return False
                # For different courses, require at least one seat gap
                elif abs(dx) <= 1 and abs(dy) <= 1:
                    return False
    return True

def find_optimal_seat(grid, rows, cols, course, spacing):
    """Find the best available seat maximizing distance from other students"""
    best_score = -1
    best_position = None
    
    for row in range(rows):
        for col in range(cols):
            if grid[row][col] is None and is_valid_seat(grid, row, col, course, spacing):
                # Calculate score based on distance to other occupied seats
                score = 0
                for r in range(rows):
                    for c in range(cols):
                        if grid[r][c] is not None:
                            distance = max(abs(row - r), abs(col - c))
                            score += distance
                
                if score > best_score:
                    best_score = score
                    best_position = (row, col)
    
    return best_position

@main.route('/generate-seating/<int:exam_id>', methods=['POST'])
def generate_seating(exam_id):
    exam = Exam.query.get_or_404(exam_id)
    
    # Get eligible students based on exam branches
    eligible_branches = [branch.strip() for branch in exam.branches.split(',')]
    students = Student.query.filter(Student.course.in_(eligible_branches)).all()
    classrooms = Classroom.query.all()
    
    if not students:
        return jsonify({'error': 'No eligible students found for this exam'}), 404
    
    if not classrooms:
        return jsonify({'error': 'No classrooms available'}), 404
    
    total_capacity = sum(c.capacity for c in classrooms)
    if len(students) > total_capacity:
        return jsonify({'error': f'Not enough seats for all students. Need {len(students)} seats but only {total_capacity} available'}), 400
    
    # Get already assigned students for this exam
    assigned_student_ids = set(
        db.session.query(SeatingArrangement.student_id)
        .filter(SeatingArrangement.exam_id == exam_id)
        .all()
    )
    
    # Filter out already assigned students
    students = [s for s in students if s.id not in assigned_student_ids]
    
    if not students:
        return jsonify({'message': 'All eligible students are already assigned seats'}), 200
    
    # Clear existing seating arrangements
    SeatingArrangement.query.filter_by(exam_id=exam_id).delete()
    
    # Calculate optimal distribution across classrooms
    distributions = calculate_classroom_capacities(classrooms, len(students))
    
    # Group students by course
    students_by_course = {}
    for student in students:
        if student.course not in students_by_course:
            students_by_course[student.course] = []
        students_by_course[student.course].append(student)
    
    for course in students_by_course:
        random.shuffle(students_by_course[course])
    
    # Create alternating list of students from different courses
    distributed_students = []
    courses = list(students_by_course.keys())
    while any(students_by_course[course] for course in courses):
        for course in courses:
            if students_by_course[course]:
                distributed_students.append(students_by_course[course].pop(0))
    
    if not distributed_students:
        return jsonify({'error': 'No students to allocate'}), 400
        
    # Initialize arrangement data
    arrangements = []
    classroom_grids = {}
    
    # Initialize grids for all classrooms
    for classroom in classrooms:
        classroom_grids[classroom.id] = {
            'grid': [[None for _ in range(classroom.columns)] for _ in range(classroom.rows)],
            'allocated': 0,
            'target': distributions[classroom.id]
        }
    
    # Try different spacing values, starting with maximum
    spacing_values = [2, 1]  # Start with 2 seat gap, then try 1 if needed
    success = False
    
    for spacing in spacing_values:
        arrangements = []  # Reset arrangements for each spacing attempt
        student_index = 0  # Reset student index
        
        # Reset classroom grids
        for grid_info in classroom_grids.values():
            grid_info['grid'] = [[None for _ in range(len(grid_info['grid'][0]))] 
                               for _ in range(len(grid_info['grid']))]
            grid_info['allocated'] = 0
            
        # Try to place all students with current spacing
        while student_index < len(distributed_students):
            current_student = distributed_students[student_index]
            placed = False
            
            # Try each classroom that hasn't reached its target
            for classroom in classrooms:
                grid_info = classroom_grids[classroom.id]
                if grid_info['allocated'] >= grid_info['target']:
                    continue
                
                # Find the optimal seat in this classroom
                position = find_optimal_seat(
                    grid_info['grid'],
                    classroom.rows,
                    classroom.columns,
                    current_student.course,
                    spacing
                )
                
                if position:
                    row, col = position
                    # Place student in grid
                    grid_info['grid'][row][col] = {
                        'student': current_student,
                        'course': current_student.course
                    }
                    grid_info['allocated'] += 1
                    
                    # Create seating arrangement
                    arrangement = SeatingArrangement(
                        exam_id=exam_id,
                        student_id=current_student.id,
                        classroom_id=classroom.id,
                        row_number=row + 1,
                        column_number=col + 1
                    )
                    arrangements.append(arrangement)
                    placed = True
                    break
            
            if not placed:
                # If we couldn't place with current spacing, break and try smaller spacing
                break
            
            student_index += 1
            
            # Check if we've placed all students
            if student_index == len(distributed_students):
                success = True
                break
        
        if success:
            break  # If we've placed all students, exit the spacing loop
    
    if not success:
        return jsonify({
            'error': 'Unable to allocate all students with safe spacing. ' +
                    f'Allocated {student_index} out of {len(distributed_students)} students.'
        }), 400
    
    # Save all arrangements
    db.session.bulk_save_objects(arrangements)
    db.session.commit()
    
    return jsonify({
        'message': f'Seating arrangement generated for {len(arrangements)} students',
        'students_placed': len(arrangements),
        'total_students': len(distributed_students)
    })
    
    for classroom in classrooms:
        if student_index >= len(distributed_students):
            break
            
        # Initialize classroom grid with None
        grid = [[None for _ in range(classroom.columns)] for _ in range(classroom.rows)]
        
        # Try to place students in valid positions
        for row in range(classroom.rows):
            for col in range(classroom.columns):
                if student_index >= len(distributed_students):
                    break
                    
                current_student = distributed_students[student_index]
                
                # Check if this seat is valid for the current student
                if is_valid_seat(grid, row, col, current_student.course, adjacent_seats):
                    # Place student in grid
                    grid[row][col] = {
                        'student': current_student,
                        'course': current_student.course
                    }
                    
                    # Create seating arrangement
                    arrangement = SeatingArrangement(
                        exam_id=exam_id,
                        student_id=current_student.id,
                        classroom_id=classroom.id,
                        row_number=row + 1,
                        column_number=col + 1
                    )
                    arrangements.append(arrangement)
                    student_index += 1
                else:
                    # Try to find the next student who can sit here
                    found_valid_student = False
                    original_index = student_index
                    
                    while student_index < len(distributed_students):
                        current_student = distributed_students[student_index]
                        if is_valid_seat(grid, row, col, current_student.course, adjacent_seats):
                            grid[row][col] = {
                                'student': current_student,
                                'course': current_student.course
                            }
                            arrangement = SeatingArrangement(
                                exam_id=exam_id,
                                student_id=current_student.id,
                                classroom_id=classroom.id,
                                row_number=row + 1,
                                column_number=col + 1
                            )
                            arrangements.append(arrangement)
                            
                            # Move the skipped students to the end
                            distributed_students = (
                                distributed_students[:original_index] +
                                distributed_students[student_index + 1:] +
                                distributed_students[original_index:student_index] +
                                [current_student]
                            )
                            student_index = original_index + 1
                            found_valid_student = True
                            break
                        student_index += 1
                    
                    if not found_valid_student:
                        # If no valid student found, reset index and leave seat empty
                        student_index = original_index
    
    # Save all arrangements
    db.session.bulk_save_objects(arrangements)
    db.session.commit()
    
    return jsonify({'message': f'Seating arrangement generated for {len(arrangements)} students'})

@main.route('/seating-arrangement/<int:exam_id>', methods=['GET'])
def get_seating_arrangement(exam_id):
    exam = Exam.query.get_or_404(exam_id)
    arrangements = SeatingArrangement.query.filter_by(exam_id=exam_id).all()
    
    # Group arrangements by classroom
    classroom_arrangements = {}
    
    for arrangement in arrangements:
        classroom_id = arrangement.classroom_id
        if classroom_id not in classroom_arrangements:
            classroom_arrangements[classroom_id] = {
                'classroom_name': arrangement.classroom.name,
                'rows': arrangement.classroom.rows,
                'columns': arrangement.classroom.columns,
                'seats': []
            }
        
        classroom_arrangements[classroom_id]['seats'].append({
            'row': arrangement.row_number,
            'column': arrangement.column_number,
            'student': {
                'roll_number': arrangement.student.roll_number,
                'name': arrangement.student.name,
                'course': arrangement.student.course
            }
        })
    
    return jsonify({
        'exam': {
            'subject_code': exam.subject_code,
            'subject_name': exam.subject_name,
            'date': exam.date.strftime('%Y-%m-%dT%H:%M')
        },
        'classrooms': list(classroom_arrangements.values())
    })

    return jsonify({'message': f'Seating arrangement generated for {len(arrangements)} students'})