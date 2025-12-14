// js/student-dashboard.js
import { db } from "./firebase-config.js";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// ==================== AUTH ====================
const userData = JSON.parse(localStorage.getItem("user"));
if (!userData || userData.role !== "student") {
  location.href = "index.html";
}

const userId = userData.phone; // Agar users collection da doc ID bo'lsa, uni ishlating

// ==================== ELEMENTLAR ====================
const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");
const sidebarOverlay = document.getElementById("sidebarOverlay");

const courseSearch = document.getElementById("courseSearch");
const courseList = document.getElementById("courseList");
const noCourses = document.getElementById("noCourses");

const welcomeSection = document.getElementById("welcomeSection");
const lessonSection = document.getElementById("lessonSection");

const breadcrumb = document.getElementById("breadcrumb");
const breadcrumbText = document.getElementById("breadcrumbText");

const welcomeName = document.getElementById("welcomeName");
const studentName = document.getElementById("studentName");

const totalCourses = document.getElementById("totalCourses");
const totalLessons = document.getElementById("totalLessons");
const completedLessonsEl = document.getElementById("completedLessons");

const ongoingCourses = document.getElementById("ongoingCourses");

const youtubePlayer = document.getElementById("youtubePlayer");
const lessonTitle = document.getElementById("lessonTitle");
const lessonDesc = document.getElementById("lessonDesc");
const pdfLink = document.getElementById("pdfLink");
const completeBtn = document.getElementById("completeBtn");
const completeText = document.getElementById("completeText");
const lessonsList = document.getElementById("lessonsList");

// ==================== STATE ====================
let allCourses = [];
let currentCourse = null;
let currentLessons = [];
let currentLessonIndex = 0;
let completedLessons = new Set(); // local cache
let unsubLessons = null;
let unsubProgress = null;

// ==================== MOBILE SIDEBAR ====================
sidebarToggle.addEventListener("click", () => {
  sidebar.classList.remove("-translate-x-full");
  sidebarOverlay.classList.remove("hidden");
});

sidebarOverlay.addEventListener("click", () => {
  sidebar.classList.add("-translate-x-full");
  sidebarOverlay.classList.add("hidden");
});

// ==================== TALABA ISMI ====================
const displayName = userData.name || userData.phone || "Talaba";
welcomeName.textContent = displayName;
studentName.textContent = displayName;

// ==================== RENDER FUNKSİYALARI (AVVAL E'LON QILINDI) ====================

function renderSidebarCourses(courses) {
  courseList.innerHTML = "";
  courses.forEach((course) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <button data-id="${course.id}" class="w-full text-left p-4 rounded-xl bg-gray-50 hover:bg-secondary hover:text-white transition shadow">
        <p class="font-semibold">📘 ${course.title}</p>
        <p class="text-sm mt-1 opacity-80">${course.description || "Izoh yoʻq"}</p>
      </button>
    `;
    li.querySelector("button").addEventListener("click", () => openCourse(course));
    courseList.appendChild(li);
  });
}

function renderOngoingCourses(courses) {
  ongoingCourses.innerHTML = "";
  courses.forEach((course) => {
    const div = document.createElement("div");
    div.className = "bg-white rounded-2xl shadow-xl p-6 cursor-pointer hover:shadow-2xl transition";
    div.innerHTML = `
      <h3 class="text-lg font-bold text-primary mb-2">📘 ${course.title}</h3>
      <p class="text-gray-600 text-sm mb-4">${course.description || "Izoh yoʻq"}</p>
      <div class="bg-gray-200 rounded-full h-2">
        <div class="bg-secondary h-full rounded-full w-1/4"></div>
      </div>
    `;
    div.addEventListener("click", () => openCourse(course));
    ongoingCourses.appendChild(div);
  });
}

function renderLessons(lessons) {
  lessonsList.innerHTML = "";
  lessons.forEach((lesson, idx) => {
    const key = `${currentCourse.id}-${lesson.id}`;
    const isCompleted = completedLessons.has(key);

    const li = document.createElement("li");
    li.innerHTML = `
      <button data-index="${idx}" class="w-full text-left p-4 rounded-xl border ${isCompleted ? 'border-secondary bg-light' : 'border-gray-200'} hover:border-secondary hover:bg-light transition flex items-center space-x-3">
        <span class="text-xl font-bold text-primary w-10">${idx + 1}</span>
        <div class="flex-1">
          <p class="font-medium">${lesson.title}</p>
        </div>
        ${isCompleted ? '<i class="fas fa-check-circle text-secondary"></i>' : ''}
      </button>
    `;
    li.querySelector("button").addEventListener("click", () => selectLesson(idx));
    lessonsList.appendChild(li);
  });
}

// ==================== PROGRESS REALTIME ====================
function loadProgress() {
  const q = query(collection(db, "progress"), where("userId", "==", userId));

  unsubProgress = onSnapshot(q, (snap) => {
    completedLessons.clear();
    snap.forEach((doc) => {
      const data = doc.data();
      completedLessons.add(`${data.courseId}-${data.lessonId}`);
    });

    completedLessonsEl.textContent = completedLessons.size;

    // Agar dars ochiq bo'lsa – UI yangilansin
    if (currentLessons.length > 0) {
      renderLessons(currentLessons); // ✅ belgilarni ko'rsatish uchun
      updateCompleteButton();
    }
  });
}

// ==================== KURSLARNI YUKLASH ====================
async function loadCourses() {
  if (!userData.assignedCourses || userData.assignedCourses.length === 0) {
    noCourses.classList.remove("hidden");
    totalCourses.textContent = "0";
    totalLessons.textContent = "0";
    completedLessonsEl.textContent = "0";
    return;
  }

  noCourses.classList.add("hidden");
  totalCourses.textContent = userData.assignedCourses.length;

  const snaps = await Promise.all(
    userData.assignedCourses.map((id) => getDoc(doc(db, "courses", id)))
  );

  allCourses = snaps
    .filter((s) => s.exists())
    .map((s) => ({ id: s.id, ...s.data() }));

  // Umumiy darslar soni
  let lessonCount = 0;
  for (const course of allCourses) {
    const q = query(
      collection(db, "lessons"),
      where("courseId", "==", course.id),
      where("active", "==", true)
    );
    const ls = await getDocs(q);
    lessonCount += ls.size;
  }
  totalLessons.textContent = lessonCount;

  renderSidebarCourses(allCourses);
  renderOngoingCourses(allCourses);

  loadProgress(); // Progressni oxirgi yuklaymiz
}

// ==================== KURS OCHISH ====================
async function openCourse(course) {
  currentCourse = course;

  welcomeSection.classList.add("hidden");
  lessonSection.classList.remove("hidden");
  breadcrumb.classList.remove("hidden");
  breadcrumbText.textContent = course.title;

  // Sidebar active kurs
  document.querySelectorAll("#courseList button").forEach((btn) => {
    const active = btn.dataset.id === course.id;
    btn.classList.toggle("bg-secondary", active);
    btn.classList.toggle("text-white", active);
    btn.classList.toggle("bg-gray-50", !active);
  });

  if (unsubLessons) unsubLessons();

  const q = query(
    collection(db, "lessons"),
    where("courseId", "==", course.id),
    where("active", "==", true),
    orderBy("order")
  );

  unsubLessons = onSnapshot(q, (snap) => {
    currentLessons = [];
    snap.forEach((d) => currentLessons.push({ id: d.id, ...d.data() }));

    renderLessons(currentLessons);

    if (currentLessons.length > 0) {
      selectLesson(0);
    } else {
      youtubePlayer.src = "";
      lessonTitle.textContent = "Darslar yoʻq";
      lessonDesc.textContent = "";
      pdfLink.classList.add("hidden");
    }
  });

  // Mobile sidebar yopish
  sidebar.classList.add("-translate-x-full");
  sidebarOverlay.classList.add("hidden");
}

// ==================== DARS TANLASH ====================
function selectLesson(index) {
  currentLessonIndex = index;
  const lesson = currentLessons[index];

  breadcrumbText.textContent = `${currentCourse.title} > ${index + 1}-dars: ${lesson.title}`;
  lessonTitle.textContent = lesson.title;
  lessonDesc.textContent = lesson.description || "Izoh yoʻq";

  // YouTube player – YouTube brendingi deyarli yoʻq
  if (lesson.youtubeId) {
    youtubePlayer.src = `https://www.youtube.com/embed/${lesson.youtubeId}?rel=0&modestbranding=1&iv_load_policy=3&color=white&cc_load_policy=0&disablekb=1&fs=1&playsinline=1&controls=1`;
  } else {
    youtubePlayer.src = "";
  }

  pdfLink.href = lesson.pdfUrl || "#";
  pdfLink.classList.toggle("hidden", !lesson.pdfUrl);

  // Active dars
  document.querySelectorAll("#lessonsList button").forEach((btn, i) => {
    btn.classList.toggle("border-secondary", i === index);
    btn.classList.toggle("bg-light", i === index);
  });

  updateCompleteButton();
}

// ==================== COMPLETE TUGMASI HOLATI ====================
function updateCompleteButton() {
  if (currentLessons.length === 0) return;
  const lesson = currentLessons[currentLessonIndex];
  const key = `${currentCourse.id}-${lesson.id}`;
  const isCompleted = completedLessons.has(key);

  if (isCompleted) {
    completeBtn.disabled = true;
    completeBtn.classList.replace("bg-primary", "bg-secondary");
    completeText.textContent = "Tugallandi ✅";
  } else {
    completeBtn.disabled = false;
    completeBtn.classList.replace("bg-secondary", "bg-primary");
    completeText.textContent = "Darsni tugatdim";
  }
}

// ==================== COMPLETE TUGMASI BOSILGANDA ====================
completeBtn.addEventListener("click", async () => {
  const lesson = currentLessons[currentLessonIndex];
  const progressId = `${userId}_${currentCourse.id}_${lesson.id}`;

  try {
    await setDoc(doc(db, "progress", progressId), {
      userId,
      courseId: currentCourse.id,
      lessonId: lesson.id,
      completedAt: serverTimestamp(),
    });

    // UI avto yangilanadi (onSnapshot orqali)
    // Keyingi darsga o'tish
    if (currentLessonIndex < currentLessons.length - 1) {
      selectLesson(currentLessonIndex + 1);
    }
  } catch (err) {
    console.error("Progress saqlashda xatolik:", err);
    alert("Darsni tugatishda xatolik yuz berdi.");
  }
});

// ==================== KURS IZLASH ====================
courseSearch.addEventListener("input", (e) => {
  const term = e.target.value.toLowerCase().trim();
  const filtered = allCourses.filter((c) =>
    c.title.toLowerCase().includes(term)
  );
  renderSidebarCourses(filtered);
});

// ==================== INIT ====================
loadCourses();