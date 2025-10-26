import argparse
from app import create_app
from app.models import db, User

parser = argparse.ArgumentParser(description='Create an admin user for the SeatPlanner app')
parser.add_argument('--username', '-u', default='admin', help='Admin username')
parser.add_argument('--password', '-p', default='secret123', help='Admin password')
args = parser.parse_args()

app = create_app()

with app.app_context():
    existing = User.query.filter_by(username=args.username).first()
    if existing:
        print(f"User '{args.username}' already exists (role={existing.role}). No action taken.")
    else:
        u = User(username=args.username, role='admin')
        u.set_password(args.password)
        db.session.add(u)
        db.session.commit()
        print(f"Admin user '{args.username}' created.")
