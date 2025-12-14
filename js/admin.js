import { db } from "./firebase-config.js";
import "./auth.js";

import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

checkAuth("admin");

window.createUser = async function () {
  const phone = document.getElementById("phone").value.trim();
  const code = document.getElementById("code").value.trim();
  const role = document.getElementById("role").value;

  if (!phone || !code) return alert("To‘ldiring");

  await addDoc(collection(db, "users"), {
    phone,
    loginCode: code,
    role,
    active: true,
  });

  alert("User yaratildi");
};

// ===== SECTION: COURSES =====

const courseList = document.getElementById("courseList");

window.createCourse = async function () {
  const title = courseTitle.value.trim();
  const description = courseDesc.value.trim();

  if (!title) return alert("Title required");

  await addDoc(collection(db, "courses"), {
    title,
    description,
    active: true,
    createdAt: serverTimestamp(),
  });

  courseTitle.value = "";
  courseDesc.value = "";
  loadCourses();
};

async function loadCourses() {
  const snap = await getDocs(collection(db, "courses"));
  courseList.innerHTML = "";

  snap.forEach((doc) => {
    const c = doc.data();
    courseList.innerHTML += `<li>📘 ${c.title}</li>`;
  });
}

loadCourses();

// ===== SECTION: LESSONS =====
import {
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

const lessonCourse = document.getElementById("lessonCourse");

async function loadCourseOptions() {
  const snap = await getDocs(collection(db, "courses"));
  lessonCourse.innerHTML = "";

  snap.forEach((doc) => {
    lessonCourse.innerHTML += `<option value="${doc.id}">${
      doc.data().title
    }</option>`;
  });
}
loadCourseOptions();

window.createLesson = async function () {
  if (!lessonCourse.value) return alert("Course tanlang");

  await addDoc(collection(db, "lessons"), {
    courseId: lessonCourse.value,
    title: lessonTitle.value,
    description: lessonDesc.value,
    youtubeId: youtubeId.value,
    pdfUrl: pdfUrl.value,
    order: Date.now(),
    active: true,
  });

  alert("Lesson added");
};

let allStudents = [];

async function loadStudents() {
  const q = query(collection(db, "users"), where("role", "==", "student"));
  const snap = await getDocs(q);

  allStudents = [];
  snap.forEach((doc) => {
    allStudents.push({
      id: doc.id,
      ...doc.data(),
    });
  });

  renderStudentTable(allStudents);
}

async function renderStudentTable(list) {
  const tbody = document.getElementById("studentTableBody");
  tbody.innerHTML = "";

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="px-4 py-2 text-center">No students found</td></tr>`;
    return;
  }

  for (let index = 0; index < list.length; index++) {
    const s = list[index];

    // ====== Get assigned courses titles ======
    let coursesAssigned = "-";
    if (s.assignedCourses && s.assignedCourses.length > 0) {
      const courseTitles = [];
      for (const cid of s.assignedCourses) {
        const courseSnap = await getDoc(doc(db, "courses", cid));
        if (courseSnap.exists()) {
          courseTitles.push(courseSnap.data().title);
        }
      }
      coursesAssigned = courseTitles.join(", ") || "-";
    }

    tbody.innerHTML += `
      <tr class="border-b border-gray-700">
        <td class="px-4 py-2">${index + 1}</td>
        <td class="px-4 py-2">${s.phone || ""}</td>
        <td class="px-4 py-2">${s.name || "-"}</td>
        <td class="px-4 py-2">${s.role || ""}</td>
        <td class="px-4 py-2">${s.loginCode || "-"}</td>
        <td class="px-4 py-2">${s.active ? "✅" : "❌"}</td>
        <td class="px-4 py-2">${coursesAssigned}</td>
      </tr>
    `;
  }
}

// ==================
// SEARCH FUNCTION
// ==================
function filterStudents() {
  const keyword = document
    .getElementById("studentSearchInput")
    .value.trim()
    .toLowerCase();

  const filtered = allStudents.filter((s) => {
    const coursesStr = (s.assignedCourses || []).join(" ").toLowerCase();
    return (
      String(s.phone).includes(keyword) ||
      (s.name && s.name.toLowerCase().includes(keyword)) ||
      (s.loginCode && s.loginCode.toLowerCase().includes(keyword)) ||
      coursesStr.includes(keyword)
    );
  });

  renderStudentTable(filtered);
}

// === INIT ===
window.addEventListener("DOMContentLoaded", () => {
  loadStudents();
});

// ===== SECTION: COURSE ASSIGNMENT =====
async function loadAssignData() {
  const usersSnap = await getDocs(
    query(collection(db, "users"), where("role", "==", "student"))
  );

  studentSelect.innerHTML = "";
  usersSnap.forEach((d) => {
    studentSelect.innerHTML += `<option value="${d.id}">${
      d.data().phone
    }</option>`;
  });

  const coursesSnap = await getDocs(collection(db, "courses"));
  assignCourseSelect.innerHTML = "";
  coursesSnap.forEach((d) => {
    assignCourseSelect.innerHTML += `<option value="${d.id}">${
      d.data().title
    }</option>`;
  });
}
loadAssignData();

window.assignCourse = async function () {
  const studentId = studentSelect.value;
  const courseId = assignCourseSelect.value;

  if (!studentId || !courseId) {
    alert("Please select student and course");
    return;
  }

  try {
    // 1️⃣ Update student's assignedCourses array
    const userRef = doc(db, "users", studentId);
    const userSnap = await getDoc(userRef);

    let assignedCourses = [];
    if (userSnap.exists()) {
      assignedCourses = userSnap.data().assignedCourses || [];
    }

    // Prevent duplicates
    if (!assignedCourses.includes(courseId)) {
      assignedCourses.push(courseId);
      await updateDoc(userRef, { assignedCourses });
    }

    // 2️⃣ Add to enrollments collection
    await addDoc(collection(db, "enrollments"), {
      studentId,
      courseId,
      assignedAt: serverTimestamp(),
    });

    alert("Course assigned successfully!");

    // 3️⃣ Refresh student list & assign search
    loadStudents(); // table section
    loadStudentsForSearch(); // assign dropdown search
  } catch (err) {
    console.error(err);
    alert("Error assigning course!");
  }
};

// ===============================
// STUDENT SEARCH (ASSIGN COURSE)
// ===============================
let allStudentsCache = [];

async function loadStudentsForSearch() {
  const q = query(collection(db, "users"), where("role", "==", "student"));

  const snap = await getDocs(q);
  allStudentsCache = [];

  snap.forEach((doc) => {
    allStudentsCache.push({
      id: doc.id,
      ...doc.data(),
    });
  });

  renderStudentOptions(allStudentsCache);
}

function searchStudents() {
  const keyword = document.getElementById("studentSearch").value.trim();

  const filtered = allStudentsCache.filter((s) =>
    String(s.phone).includes(keyword)
  );

  renderStudentOptions(filtered);
}

function renderStudentOptions(list) {
  const select = document.getElementById("studentSelect");
  select.innerHTML = "";

  if (list.length === 0) {
    select.innerHTML = `<option>No students found</option>`;
    return;
  }

  list.forEach((student) => {
    const opt = document.createElement("option");
    opt.value = student.id;
    opt.textContent = `${student.phone}`;
    select.appendChild(opt);
  });
}

window.addEventListener("DOMContentLoaded", () => {
  loadStudentsForSearch();
});
