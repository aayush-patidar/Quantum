
import { storage } from "./server/storage";
import { db } from "./server/storage";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

async function seed() {
    console.log("Starting seed process...");

    // 1. Check if courses exist
    const existingCourses = await storage.getAllCourses();
    if (existingCourses.length > 0) {
        console.log("Courses already taken. Skipping seed.");
        process.exit(0);
    }

    // 2. Ensure an instructor user exists
    let instructor = await storage.getUserByUsername("system_instructor");
    if (!instructor) {
        console.log("Creating system instructor...");
        // We need to bypass storage.createUser if we want specific ID or just let it generate
        // But createUser takes InsertUser.
        instructor = await storage.createUser({
            username: "system_instructor",
            email: "instructor@quantum.local",
            password: "hashed_placeholder", // In real app, hash this.
            role: "admin",
            experienceLevel: "expert",
            displayName: "Quantum Instructor",
            creditBalance: 1000,
        });
    }

    console.log(`Using instructor: ${instructor.id}`);

    // 3. Define courses
    const demoCourses = [
        {
            title: "Quantum Computing Fundamentals",
            description: "Master the core concepts of qubits, superposition, entanglement, and quantum gates. This comprehensive course takes you from zero to understanding the fundamental building blocks of quantum information.",
            difficulty: "beginner",
            category: "Theory",
            tags: ["qubits", "superposition", "entanglement", "gates"],
            instructorId: instructor.id,
            isPublished: true,
        },
        {
            title: "Quantum Algorithms & Logic",
            description: "Dive deep into the most famous quantum algorithms. Understand how Shor's and Grover's algorithms provide exponential speedups and learn to implement them.",
            difficulty: "intermediate",
            category: "Algorithms",
            tags: ["shor", "grover", "algorithms", "complexity"],
            instructorId: instructor.id,
            isPublished: true,
        },
        {
            title: "Quantum Hardware Architecture",
            description: "Explore the physical implementation of quantum computers, from superconducting circuits to trapped ions. Learn about the challenges of noise and coherence.",
            difficulty: "advanced",
            category: "Hardware",
            tags: ["superconducting", "trapped-ion", "hardware", "cryogenics"],
            instructorId: instructor.id,
            isPublished: true,
        },
        {
            title: "Qiskit & Circuit Design",
            description: "Get hands-on practical experience by designing and running quantum circuits using IBM's Qiskit SDK. Build your first quantum programs.",
            difficulty: "intermediate",
            category: "Programming",
            tags: ["qiskit", "python", "circuits", "ibm-quantum"],
            instructorId: instructor.id,
            isPublished: true,
        },
        {
            title: "Quantum Error Correction",
            description: "Learn how to protect delicate quantum states from environmental noise. Study surface codes, stabilizer codes, and fault-tolerant computing.",
            difficulty: "advanced",
            category: "Theory",
            tags: ["error-correction", "shor-code", "surface-code", "fault-tolerance"],
            instructorId: instructor.id,
            isPublished: true,
        },
        {
            title: "Quantum Machine Learning",
            description: "At the intersection of AI and Quantum Computing. Learn about variational quantum eigensolvers (VQE), QAOA, and quantum neural networks.",
            difficulty: "advanced",
            category: "AI",
            tags: ["qml", "ai", "optimization", "vqe", "qaoa"],
            instructorId: instructor.id,
            isPublished: true,
        }
    ];

    // 4. Insert courses and lessons
    for (const c of demoCourses) {
        console.log(`Creating course: ${c.title}...`);
        try {
            const createdCourse = await storage.createCourse(c as any);

            // Create random number of lessons (8-15)
            const lessonCount = Math.floor(Math.random() * 8) + 8;

            for (let i = 1; i <= lessonCount; i++) {
                await storage.createLesson({
                    courseId: createdCourse.id,
                    title: `Lesson ${i}: ${c.category} Concepts`,
                    content: `This is the content for lesson ${i} of ${c.title}. \n\nIn this lesson, we cover key topics essential for understanding ${c.tags[0]} and ${c.tags[1] || 'related concepts'}.`,
                    sortOrder: i,
                    // labId etc optional
                } as any);
            }
        } catch (error) {
            console.error(`Failed to create course ${c.title}:`, error);
        }
    }

    console.log("Seeding complete!");
    process.exit(0);
}

seed().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
});
