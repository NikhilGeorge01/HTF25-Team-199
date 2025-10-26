from app import create_app
from app.models import db, Student, Classroom, Exam
from datetime import datetime, timedelta

def reset_database():
    app = create_app()
    
    with app.app_context():
        # Drop all existing tables
        print("Dropping all tables...")
        db.drop_all()
        
        # Create fresh tables
        print("Creating new tables...")
        db.create_all()
        
        # Add sample data
        print("Adding sample data...")
        
        # Add sample classrooms
        classrooms = [
            Classroom(name='Room 101', capacity=40, rows=5, columns=8),
            Classroom(name='Room 102', capacity=50, rows=5, columns=10),
            Classroom(name='Room 103', capacity=60, rows=6, columns=10)
        ]
        db.session.add_all(classrooms)
        
        # Add sample students
        students = []
        courses = ['CSE', 'IT', 'ECE']
        roll_base = {'CSE': '101', 'IT': '201', 'ECE': '301'}
        
        for course in courses:
            for i in range(1, 11):  # 10 students per course
                roll_number = f"2023{roll_base[course]}{i:02d}"
                student = Student(
                    roll_number=roll_number,
                    name=f"{course} Student {i}",
                    course=course,
                    semester=1
                )
                students.append(student)
        
        db.session.add_all(students)
        
        # Add sample exams
        today = datetime.now().replace(hour=9, minute=0, second=0, microsecond=0)
        exams = [
            Exam(
                subject_code='CS101',
                subject_name='Introduction to Programming',
                date=today + timedelta(days=1),
                duration=180,
                session='Morning',
                branches='CSE,IT'
            ),
            Exam(
                subject_code='EC101',
                subject_name='Basic Electronics',
                date=today + timedelta(days=1, hours=5),  # Afternoon session
                duration=180,
                session='Afternoon',
                branches='ECE'
            ),
            Exam(
                subject_code='MA101',
                subject_name='Engineering Mathematics',
                date=today + timedelta(days=2),
                duration=180,
                session='Morning',
                branches='CSE,IT,ECE'
            )
        ]
        db.session.add_all(exams)
        
        # Commit all changes
        print("Committing changes...")
        db.session.commit()
        print("Database reset complete!")

if __name__ == '__main__':
    reset_database()