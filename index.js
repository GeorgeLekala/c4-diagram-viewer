const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const { spawn } = require("child_process");

const app = express();
const port = 3000;

const VIEWS_DIR = path.join(__dirname, "views");
const PUBLIC_DIR = path.join(__dirname, "public");
const DIAGRAMS_DIR = path.join(__dirname, "diagrams");
const PLANTUML_JAR_PATH = path.join(__dirname, "lib", "plantuml.jar");

// Ensure the diagrams directory exists
async function initializeDiagramsDir() {
    try {
        await fs.mkdir(DIAGRAMS_DIR, { recursive: true });
    } catch (err) {
        console.error("Error initializing diagrams directory:", err);
    }
}

// Load all systems from the diagrams directory
async function loadSystems() {
    const systems = {};
    try {
        const systemDirs = await fs.readdir(DIAGRAMS_DIR, {
            withFileTypes: true,
        });
        for (const dir of systemDirs) {
            if (dir.isDirectory()) {
                const systemName = dir.name;
                const systemDir = path.join(DIAGRAMS_DIR, systemName);
                systems[systemName] = {
                    info: {
                        md: await fs
                            .readFile(path.join(systemDir, "info.md"), "utf8")
                            .catch(() => ""),
                    },
                    context: {
                        puml: await fs
                            .readFile(
                                path.join(systemDir, "context.puml"),
                                "utf8",
                            )
                            .catch(() => ""),
                        md: await fs
                            .readFile(
                                path.join(systemDir, "context.md"),
                                "utf8",
                            )
                            .catch(() => ""),
                    },
                    containers: {
                        puml: await fs
                            .readFile(
                                path.join(systemDir, "containers.puml"),
                                "utf8",
                            )
                            .catch(() => ""),
                        md: await fs
                            .readFile(
                                path.join(systemDir, "containers.md"),
                                "utf8",
                            )
                            .catch(() => ""),
                    },
                    components: {
                        puml: await fs
                            .readFile(
                                path.join(systemDir, "components.puml"),
                                "utf8",
                            )
                            .catch(() => ""),
                        md: await fs
                            .readFile(
                                path.join(systemDir, "components.md"),
                                "utf8",
                            )
                            .catch(() => ""),
                    },
                    code: {
                        puml: await fs
                            .readFile(path.join(systemDir, "code.puml"), "utf8")
                            .catch(() => ""),
                        md: await fs
                            .readFile(path.join(systemDir, "code.md"), "utf8")
                            .catch(() => ""),
                    },
                    deployment: {
                        puml: await fs
                            .readFile(
                                path.join(systemDir, "deployment.puml"),
                                "utf8",
                            )
                            .catch(() => ""),
                        md: await fs
                            .readFile(
                                path.join(systemDir, "deployment.md"),
                                "utf8",
                            )
                            .catch(() => ""),
                    },
                    documentation: {
                        md: await fs
                            .readFile(
                                path.join(systemDir, "documentation.md"),
                                "utf8",
                            )
                            .catch(() => ""),
                    },
                };
            }
        }
    } catch (err) {
        console.error("Error loading systems:", err);
    }
    return systems;
}

app.use(express.static(PUBLIC_DIR));
app.use(express.json());

// Helper function to render PlantUML diagram locally
async function renderPlantUML(pumlCode) {
    return new Promise((resolve, reject) => {
        const { spawn } = require("child_process");
        const plantumlProcess = spawn("java", ["-jar", PLANTUML_JAR_PATH, "-pipe", "-tsvg"]);

        let svgOutput = "";
        let errorOutput = "";

        plantumlProcess.stdin.write(pumlCode);
        plantumlProcess.stdin.end();

        plantumlProcess.stdout.on("data", (data) => {
            svgOutput += data.toString();
        });

        plantumlProcess.stderr.on("data", (data) => {
            errorOutput += data.toString();
        });

        plantumlProcess.on("close", (code) => {
            if (code === 0 && svgOutput) {
                resolve(svgOutput);
            } else {
                reject(new Error(`PlantUML rendering failed: ${errorOutput || "No output"}`));
            }
        });

        plantumlProcess.on("error", (err) => {
            reject(new Error(`Failed to start PlantUML process: ${err.message}`));
        });
    });
}

// Initialize diagrams directory on startup
initializeDiagramsDir().then(() => {
    console.log("Diagrams directory initialized");
});

// Serve the workspace homepage
app.get("/", (req, res) => {
    res.sendFile(path.join(VIEWS_DIR, "index.html"));
});

// API to get all systems
app.get("/api/systems", async (req, res) => {
    const systems = await loadSystems();
    res.json(systems);
});

// API to add a new system
app.post("/api/systems", async (req, res) => {
    const { name } = req.body;
    const systemDir = path.join(DIAGRAMS_DIR, name);
    try {
        const systems = await loadSystems();
        if (name && !systems[name]) {
            await fs.mkdir(systemDir);
            await fs.writeFile(path.join(systemDir, "info.md"), "");
            await fs.writeFile(path.join(systemDir, "context.puml"), "");
            await fs.writeFile(path.join(systemDir, "context.md"), "");
            await fs.writeFile(path.join(systemDir, "containers.puml"), "");
            await fs.writeFile(path.join(systemDir, "containers.md"), "");
            await fs.writeFile(path.join(systemDir, "components.puml"), "");
            await fs.writeFile(path.join(systemDir, "components.md"), "");
            await fs.writeFile(path.join(systemDir, "code.puml"), "");
            await fs.writeFile(path.join(systemDir, "code.md"), "");
            await fs.writeFile(path.join(systemDir, "deployment.puml"), "");
            await fs.writeFile(path.join(systemDir, "deployment.md"), "");
            await fs.writeFile(path.join(systemDir, "documentation.md"), "");
            res.status(201).json({ message: "System added", name });
        } else {
            res.status(400).json({
                error: "Invalid system name or system already exists",
            });
        }
    } catch (err) {
        console.error("Error adding system:", err);
        res.status(500).json({ error: "Failed to add system" });
    }
});

// API to save a diagram
app.put("/api/systems/:system/:type", async (req, res) => {
    const { system, type } = req.params;
    const { puml, md } = req.body;
    const systemDir = path.join(DIAGRAMS_DIR, system);
    try {
        const systems = await loadSystems();
        if (
            systems[system] &&
            [
                "info",
                "context",
                "containers",
                "components",
                "code",
                "deployment",
                "documentation",
            ].includes(type)
        ) {
            if (
                [
                    "context",
                    "containers",
                    "components",
                    "code",
                    "deployment",
                ].includes(type)
            ) {
                await fs.writeFile(
                    path.join(systemDir, `${type}.puml`),
                    puml || "",
                );
                await fs.writeFile(
                    path.join(systemDir, `${type}.md`),
                    md || "",
                );
            } else {
                await fs.writeFile(
                    path.join(systemDir, `${type}.md`),
                    md || "",
                );
            }
            res.json({ message: "Diagram saved" });
        } else {
            res.status(404).json({ error: "System or diagram type not found" });
        }
    } catch (err) {
        console.error("Error saving diagram:", err);
        res.status(500).json({ error: "Failed to save diagram" });
    }
});

// Preview endpoint for rendering PlantUML locally
app.post("/preview", async (req, res) => {
    console.log("Received preview request:", req.body);
    const { pumlCode } = req.body;

    if (!pumlCode) {
        console.log("No PlantUML code provided");
        return res.status(400).json({ error: "No PlantUML code provided." });
    }

    try {
        const svg = await renderPlantUML(pumlCode);
        res.json({ svg });
    } catch (procError) {
        console.error("Error rendering preview from PlantUML:", procError);
        res.status(500).json({
            error: `Failed to render diagram: ${procError.message}`,
        });
    }
});

// Dynamic diagram route (for drill-down and viewing)
app.get("/diagram/:system/:type", async (req, res) => {
    const { system, type } = req.params;
    const systems = await loadSystems();

    if (!systems[system] || !systems[system][type]) {
        return res
            .status(404)
            .json({ error: `Diagram for ${system} (${type}) not found.` });
    }

    const data = systems[system][type];
    let diagramSvg = "";
    let content = "";

    if (
        ["context", "containers", "components", "code", "deployment"].includes(
            type,
        )
    ) {
        const puml = data.puml || "";
        const md = data.md || "";
        diagramSvg = puml
            ? '<p class="has-text-danger">Error rendering diagram.</p>'
            : "";
        if (puml) {
            try {
                diagramSvg = await renderPlantUML(puml);
            } catch (procError) {
                console.error(
                    `Error rendering ${system} (${type}):`,
                    procError,
                );
                diagramSvg = `<p class="has-text-danger">Failed to render diagram: ${procError.message}</p>`;
            }
        }
        content = `
            <div class="columns is-multiline">
                <div class="column is-full">
                    <h2>Rendered Diagram</h2>
                    <div class="box diagram-output" id="diagram-output">
                        ${diagramSvg}
                    </div>
                    <div class="buttons">
                        <button class="button is-info" id="zoom-in"><i class="fas fa-search-plus"></i> Zoom In</button>
                        <button class="button is-info" id="zoom-out"><i class="fas fa-search-minus"></i> Zoom Out</button>
                        <button class="button is-info" id="zoom-reset"><i class="fas fa-undo"></i> Reset</button>
                    </div>
                </div>
                <div class="column is-full">
                    <h2>Explanation</h2>
                    <div class="box explanation-content" id="explanation-content">${md}</div>
                </div>
            </div>
            <script>
                document.addEventListener('DOMContentLoaded', () => {
                    const explanationContent = document.getElementById('explanation-content');
                    if (explanationContent && typeof marked !== 'undefined' && marked.parse) {
                        explanationContent.innerHTML = marked.parse(explanationContent.innerText);
                    } else if (explanationContent) {
                        console.error('Marked library failed to load or is not defined.');
                        explanationContent.innerHTML = '<p class="has-text-danger">Failed to render markdown content. Please try refreshing the page or check your internet connection.</p>';
                    }
                });
            </script>
        `;
    } else {
        const md = data.md || "";
        content = `
            <div class="box content" id="markdown-content">${md}</div>
            <script>
                document.addEventListener('DOMContentLoaded', () => {
                    const markdownContent = document.getElementById('markdown-content');
                    if (markdownContent && typeof marked !== 'undefined' && marked.parse) {
                        markdownContent.innerHTML = marked.parse(markdownContent.innerText);
                    } else if (markdownContent) {
                        console.error('Marked library failed to load or is not defined.');
                        markdownContent.innerHTML = '<p class="has-text-danger">Failed to render markdown content. Please try refreshing the page or check your internet connection.</p>';
                    }
                });
            </script>
        `;
    }

    const htmlTemplate = `
        <!DOCTYPE html>
        <html lang="en" data-theme="light">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>ArchViz | ${system} (${type.charAt(0).toUpperCase() + type.slice(1)})</title>
            <link href="https://cdn.jsdelivr.net/npm/bulma@1.0.3/css/bulma.min.css" rel="stylesheet">
            <link rel="stylesheet" href="/style.css">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
            <script type="text/javascript" src="https://cdn.jsdelivr.net/npm/svg-pan-zoom@3.6.2/dist/svg-pan-zoom.min.js"></script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/marked/15.0.7/marked.min.js" integrity="sha512-rPuOZPx/WHMHNx2RoALKwiCDiDrCo4ekUctyTYKzBo8NGA79NcTW2gfrbcCL2RYL7RdjX2v9zR0fKyI4U4kPew==" crossorigin="anonymous" referrerpolicy="no-referrer" defer></script>
        </head>
        <body>
            <!-- Navbar -->
            <nav class="navbar" role="navigation" aria-label="main navigation">
                <div class="navbar-brand">
                    <a href="/" class="navbar-item">
                        <span class="has-text-weight-semibold">ArchViz</span>
                    </a>
                </div>
                <div class="navbar-menu">
                    <div class="navbar-end">
                        <div class="navbar-item has-dropdown is-hoverable">
                            <a class="navbar-link">Options</a>
                            <div class="navbar-dropdown is-right">
                                <a class="navbar-item" onclick="toggleTheme()">Toggle theme</a>
                                <hr class="navbar-divider">
                                <div class="navbar-item has-text-grey-light">
                                    <span>v</span><span>1.0.0</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            <!-- Main Layout -->
            <div class="site-layout" id="site">
                <!-- Sidebar -->
                <aside class="menu p-3">
                    <p class="menu-label">General</p>
                    <ul class="menu-list">
                        <li><a href="/">Home</a></li>
                    </ul>
                    <p class="menu-label">Systems</p>
                    <ul class="menu-list">
                        ${Object.keys(systems)
                            .map(
                                (s) => `
                            <li><a href="/diagram/${s}/info"${s === system ? ' class="is-active"' : ""}>${s}</a></li>
                        `,
                            )
                            .join("")}
                    </ul>
                </aside>

                <!-- Main Content -->
                <div class="container is-fluid">
                    <h1 class="title mt-3">${system}</h1>
                    <h2 class="subtitle">${type.charAt(0).toUpperCase() + type.slice(1)}</h2>

                    <!-- Tabs -->
                    <div class="tabs mt-3">
                        <ul>
                            ${[
                                "info",
                                "context",
                                "containers",
                                "components",
                                "code",
                                "deployment",
                                "documentation",
                            ]
                                .map(
                                    (t) => `
                                <li${t === type ? ' class="is-active"' : ""}><a href="/diagram/${system}/${t}">${t.charAt(0).toUpperCase() + t.slice(1)}</a></li>
                            `,
                                )
                                .join("")}
                        </ul>
                    </div>

                    <!-- Content -->
                    <div class="content p-3">
                        ${content}
                    </div>
                </div>
            </div>

            <script>
                document.addEventListener('DOMContentLoaded', () => {
                    let scale = 1;
                    const diagramOutput = document.getElementById('diagram-output');

                    if (diagramOutput) {
                        const zoomInBtn = document.getElementById('zoom-in');
                        const zoomOutBtn = document.getElementById('zoom-out');
                        const zoomResetBtn = document.getElementById('zoom-reset');

                        function updateZoom() {
                            diagramOutput.style.transform = 'scale(' + scale + ')';
                            diagramOutput.style.transformOrigin = '0 0';
                        }

                        zoomInBtn.addEventListener('click', () => {
                            scale += 0.1;
                            scale = Math.min(scale, 3);
                            updateZoom();
                        });

                        zoomOutBtn.addEventListener('click', () => {
                            scale -= 0.1;
                            scale = Math.max(scale, 0.1);
                            updateZoom();
                        });

                        zoomResetBtn.addEventListener('click', () => {
                            scale = 1;
                            updateZoom();
                        });

                        diagramOutput.addEventListener('wheel', (e) => {
                            e.preventDefault();
                            const delta = e.deltaY > 0 ? -0.1 : 0.1;
                            scale += delta;
                            scale = Math.min(Math.max(0.1, scale), 3);
                            updateZoom();
                        });

                        let initialDistance = null;
                        diagramOutput.addEventListener('touchstart', (e) => {
                            if (e.touches.length === 2) {
                                initialDistance = Math.hypot(
                                    e.touches[0].pageX - e.touches[1].pageX,
                                    e.touches[0].pageY - e.touches[1].pageY
                                );
                            }
                        });

                        diagramOutput.addEventListener('touchmove', (e) => {
                            if (e.touches.length === 2 && initialDistance) {
                                const newDistance = Math.hypot(
                                    e.touches[0].pageX - e.touches[1].pageX,
                                    e.touches[0].pageY - e.touches[1].pageY
                                );
                                const delta = newDistance - initialDistance;
                                scale += delta * 0.001;
                                scale = Math.min(Math.max(0.1, scale), 3);
                                updateZoom();
                                initialDistance = newDistance;
                                e.preventDefault();
                            }
                        });

                        diagramOutput.addEventListener('touchend', () => {
                            initialDistance = null;
                        });
                    }
                });

                function toggleTheme() {
                    const html = document.documentElement;
                    const currentTheme = html.getAttribute('data-theme');
                    html.setAttribute('data-theme', currentTheme === 'light' ? 'dark' : 'light');
                }
            </script>
        </body>
        </html>
    `;

    res.send(htmlTemplate);
});

// Catch-all for unhandled errors
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err.stack);
    res.status(500).json({ error: "Internal server error" });
});

// Start the server
app.listen(port, () => {
    console.log(`ArchViz app listening at http://localhost:${port}`);
});