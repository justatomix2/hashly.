// ANONYMOUS PROFILE
if (!localStorage.user) {
  localStorage.user = "User" + Math.floor(Math.random()*9999);
  localStorage.avatar = "https://api.dicebear.com/7.x/thumbs/svg?seed=" + localStorage.user;
}

// LOAD POSTS
async function loadPosts() {
  const posts = await fetch("/posts").then(r => r.json());
  const feed = document.getElementById("feed");
  feed.innerHTML = "";

  posts.forEach(p => {
    const div = document.createElement("div");
    div.innerHTML = `
      <img src="${p.avatar}" width="40" style="border-radius:50%">
      <b>${p.user}</b><br><br>
      <p>${p.text}</p>

      ${p.mediaUrl ? (
        p.mediaUrl.endsWith(".mp4")
        ? `<video src="${p.mediaUrl}" controls></video>`
        : `<img src="${p.mediaUrl}">`
      ) : ""}

      <button onclick="like(${p.id}, ${JSON.stringify(p.hashtags)})">❤️ ${p.likes}</button>
      <button onclick="share(${p.id})">🔗 ${p.shares}</button>
      <a href="post.html?id=${p.id}">💬 Commentaires (${p.comments.length})</a>
    `;
    feed.append(div);
  });
}

// LIKE
async function like(id, tags) {
  await fetch("/like", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({postId:id})
  });

  // Save liked hashtags for recommender
  let liked = JSON.parse(localStorage.getItem("liked") || "[]");
  tags.forEach(t => {
    if (!liked.includes(t)) liked.push(t);
  });
  localStorage.setItem("liked", JSON.stringify(liked));

  loadPosts();
}

// SHARE
async function share(id) {
  await fetch("/share", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({postId:id})
  });
  alert("Lien copié !");
}

// CREATE POST
postForm.onsubmit = async e => {
  e.preventDefault();

  const fd = new FormData();
  fd.append("text", text.value);
  fd.append("user", localStorage.user);
  fd.append("avatar", localStorage.avatar);

  if (file.files[0]) fd.append("file", file.files[0]);

  await fetch("/posts", { method:"POST", body:fd });

  text.value = "";
  file.value = "";

  loadPosts();
};

// LOAD TRENDS
fetch("/trends")
  .then(r => r.json())
  .then(tr => {
    trends.innerHTML = tr.map(t => `<li>${t[0]} (${t[1]})</li>`).join("");
  });

// MODE SOMBRE
darkToggle.onclick = () => {
  document.body.classList.toggle("dark");
};

// IF ON POST PAGE, LOAD COMMENTS
if (location.pathname.includes("post.html")) {
  const id = new URLSearchParams(location.search).get("id");

  fetch("/posts").then(r => r.json()).then(posts => {
    const p = posts.find(x => x.id == id);

    post.innerHTML = `
      <h2>${p.text}</h2>
      ${p.mediaUrl ? `<img src="${p.mediaUrl}">` : ""}
    `;

    comments.innerHTML = p.comments.map(c => `
      <p><img src="${c.avatar}" width=30> <b>${c.user}</b><br>${c.text}</p>
    `).join("");

    commentForm.onsubmit = async e => {
      e.preventDefault();
      await fetch("/comment", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          postId:id,
          text:commentText.value,
          user:localStorage.user,
          avatar:localStorage.avatar
        })
      });
      location.reload();
    };
  });
}

loadPosts();
