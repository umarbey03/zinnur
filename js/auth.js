import { db } from "./firebase-config.js";

import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

window.login = async function () {
  const phone = document.getElementById("phone").value.trim();
  const code = document.getElementById("code").value.trim();
  const error = document.getElementById("error");

  error.textContent = "";

  if (!phone || !code) {
    error.textContent = "Telefon va kodni kiriting";
    return;
  }

  const q = query(
    collection(db, "users"),
    where("phone", "==", phone),
    where("loginCode", "==", code),
    where("active", "==", true)
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    error.textContent = "Nomer yoki kod xato";
    return;
  }

  const user = snap.docs[0].data();
  localStorage.setItem("user", JSON.stringify(user));

  if (user.role === "admin") {
    location.href = "admin.html";
  } else {
    location.href = "dashboard.html";
  }
};

window.checkAuth = function (role) {
  const user = JSON.parse(localStorage.getItem("user"));

  if (!user || user.role !== role) {
    location.href = "index.html";
  }
};

window.logout = function () {
  localStorage.removeItem("user");
  location.href = "index.html";
};
