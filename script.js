window.addEventListener("load", () => {
  const svg = document.getElementById("canvas-svg");
  const app = document.getElementById("app");
  const zoomContainer = document.getElementById("zoom-container");
  const zoomInBtn = document.getElementById("zoom-in");
  const zoomOutBtn = document.getElementById("zoom-out");
  const zoomResetBtn = document.getElementById("zoom-reset");
  const zoomDisplay = document.getElementById("zoom-level");

  let nodeCount = 1;
  let connections = [];
  let paths = {};
  let zoomLevel = 1.0;

  // --- ZOOM LOGIC ---
  function updateZoom() {
    zoomContainer.style.transform = `scale(${zoomLevel})`;
    zoomDisplay.innerText = `${Math.round(zoomLevel * 100)}%`;
  }

  zoomInBtn.onclick = () => {
    zoomLevel *= 1.1;
    updateZoom();
  };
  zoomOutBtn.onclick = () => {
    zoomLevel /= 1.1;
    updateZoom();
  };
  zoomResetBtn.onclick = () => {
    zoomLevel = 1.0;
    updateZoom();
  };

  // NEW: Scroll Wheel Zoom (Middle Mouse Button / Wheel)
  // We apply this to the window so you can zoom from anywhere
  window.addEventListener(
    "wheel",
    (e) => {
      // Check if Ctrl is held (standard browser behavior) or just scroll
      // If you want it ONLY on scroll, remove the e.ctrlKey check
      e.preventDefault();
      const zoomSpeed = 0.05;
      if (e.deltaY < 0) {
        zoomLevel *= 1 + zoomSpeed;
      } else {
        zoomLevel /= 1 + zoomSpeed;
      }
      updateZoom();
    },
    { passive: false },
  );

  // --- LINE LOGIC ---
  function createLine(fromId, toId) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("class", "connector");
    svg.prepend(path);
    paths[`${fromId}-${toId}`] = path;
    connections.push({ from: fromId, to: toId });
  }

  function updateLines() {
    connections.forEach((conn) => {
      const f = document.getElementById(conn.from);
      const t = document.getElementById(conn.to);
      const p = paths[`${conn.from}-${conn.to}`];
      if (!f || !t || !p) return;

      const fX = f.offsetLeft + f.offsetWidth;
      const fY = f.offsetTop + f.offsetHeight / 2;
      const tX = t.offsetLeft;
      const tY = t.offsetTop + t.offsetHeight / 2;
      const controlDist = Math.abs(tX - fX) / 2;

      p.setAttribute(
        "d",
        `M ${fX} ${fY} C ${fX + controlDist} ${fY} ${tX - controlDist} ${tY} ${tX} ${tY}`,
      );
    });
  }

  // --- DELETE LOGIC (Recursive) ---
  function deleteNodeAndDescendants(nodeId) {
    // 1. Find all immediate children
    const children = connections.filter((conn) => conn.from === nodeId);

    // 2. Recursively delete children first
    children.forEach((child) => {
      deleteNodeAndDescendants(child.to);
    });

    // 3. Remove connections and paths related to this node
    connections = connections.filter((conn) => {
      if (conn.to === nodeId || conn.from === nodeId) {
        const pathKey = `${conn.from}-${conn.to}`;
        if (paths[pathKey]) {
          paths[pathKey].remove();
          delete paths[pathKey];
        }
        return false;
      }
      return true;
    });

    // 4. Remove the actual node element from DOM
    const nodeEl = document.getElementById(nodeId);
    if (nodeEl && nodeId !== "node-0") {
      // Optional: prevent deleting the root node
      nodeEl.remove();
    }
  }

  // --- DRAG LOGIC ---
  function makeDraggable(node) {
    const header = node.querySelector(".header");
    header.addEventListener("mousedown", (e) => {
      if (e.target.tagName === "BUTTON" || e.target.tagName === "TEXTAREA")
        return;

      e.preventDefault();

      // Get the app container's position — this is what offsetLeft/offsetTop are relative to
      const appRect = app.getBoundingClientRect();

      // Where the mouse is inside the app container (accounting for zoom)
      const mouseXInApp = (e.clientX - appRect.left) / zoomLevel;
      const mouseYInApp = (e.clientY - appRect.top) / zoomLevel;

      // How far inside the node the user clicked
      const offsetX = mouseXInApp - node.offsetLeft;
      const offsetY = mouseYInApp - node.offsetTop;

      const move = (ev) => {
        const curMouseXInApp = (ev.clientX - appRect.left) / zoomLevel;
        const curMouseYInApp = (ev.clientY - appRect.top) / zoomLevel;
        node.style.left = curMouseXInApp - offsetX + "px";
        node.style.top = curMouseYInApp - offsetY + "px";
        updateLines();
      };

      const up = () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
      };

      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
    });
  }
  // --- SPAWN LOGIC ---
  function setupNode(node) {
    makeDraggable(node);

    // Add Child Button
    node.querySelector(".spawn-btn").onclick = (e) => {
      e.stopPropagation();
      const newId = `node-${nodeCount++}`;
      const newNode = document.createElement("div");
      newNode.className = "node";
      newNode.id = newId;
      newNode.style.left = node.offsetLeft + 300 + "px";
      newNode.style.top = node.offsetTop + (Math.random() * 100 - 50) + "px";

      newNode.innerHTML = `
        <div class="header">
            <span>Node ${nodeCount - 1}</span>
            <button class="close-btn">×</button>
        </div>
        <div class="content">
          <textarea placeholder="Type something..."></textarea>
          <div class="footer">
            <button class="spawn-btn">Add Child +</button>
          </div>
        </div>`;

      app.appendChild(newNode);
      createLine(node.id, newId);
      setupNode(newNode);
      updateLines();
    };

    // Close Button Logic
    const closeBtn = node.querySelector(".close-btn");
    if (closeBtn) {
      closeBtn.onclick = (e) => {
        e.stopPropagation();
        deleteNodeAndDescendants(node.id);
        updateLines();
      };
    }
  }

  const rootNode = document.getElementById("node-0");
  if (rootNode) setupNode(rootNode);
});
