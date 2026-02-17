// Quick script to check enrollments in the database
import Database from 'better-sqlite3';

const db = new Database('quantum.db');

console.log('\n=== COURSE ENROLLMENTS ===\n');

const enrollments = db.prepare('SELECT * FROM course_enrollments').all();

if (enrollments.length === 0) {
    console.log('❌ No enrollments found in database');
} else {
    console.log(`✅ Found ${enrollments.length} enrollments:\n`);
    enrollments.forEach((e, i) => {
        console.log(`${i + 1}. User: ${e.userId}, Course: ${e.courseId}, Progress: ${e.progress}%`);
    });
}

console.log('\n=== USERS ===\n');
const users = db.prepare('SELECT id, username, email FROM users').all();
users.forEach(u => {
    console.log(`- ${u.username} (${u.email}) - ID: ${u.id}`);
});

db.close();
