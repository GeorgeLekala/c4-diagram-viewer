const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = 3000;

const VIEWS_DIR = path.join(__dirname, 'views');
const PUBLIC_DIR = path.join(__dirname, 'public');
const DIAGRAMS_DIR = path.join(__dirname, 'diagrams');

// Ensure the diagrams directory exists and initialize with default data if empty
async function initializeDiagramsDir() {
    try {
        await fs.mkdir(DIAGRAMS_DIR, { recursive: true });
        const systems = await fs.readdir(DIAGRAMS_DIR);
        if (systems.length === 0) {
            const systemXDir = path.join(DIAGRAMS_DIR, 'System X');
            await fs.mkdir(systemXDir);
            // Info
            await fs.writeFile(path.join(systemXDir, 'info.md'), `# System X Info
- **Description**: This is a sample system for demonstration purposes.
- **Vision**: To provide a scalable architecture visualization tool.
- **References**:
  - [C4 Model](https://c4model.com)`);
            // Context
            await fs.writeFile(path.join(systemXDir, 'context.puml'), `@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml
title System Context Diagram for System X
Person(user, "User", "A person interacting with System X")
System(sys_x, "System X", "The core application providing key functionality")
System_Ext(ext_sys, "External System", "An external service providing data or functionality")
Rel(user, sys_x, "Uses", "HTTPS")
Rel(sys_x, ext_sys, "Integrates with", "API/JSON")
SHOW_LEGEND()
@enduml`);
            await fs.writeFile(path.join(systemXDir, 'context.md'), `# System X Context Diagram
This diagram shows the high-level context of System X, including:
- **User**: Interacts with System X via HTTPS.
- **System X**: The core application.
- **External System**: Provides data via API/JSON.`);
            // Containers
            await fs.writeFile(path.join(systemXDir, 'containers.puml'), `@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml
title Container Diagram for System X
Person(user, "User", "A person interacting with System X")
System_Boundary(c1, "System X") {
    Container(web_app, "Web App", "JavaScript, React", "Delivers the user interface")
    Container(api, "API", "Java, Spring Boot", "Handles business logic and data")
    ContainerDb(db, "Database", "PostgreSQL", "Stores application data")
}
System_Ext(ext_sys, "External System", "Provides data or functionality")
Rel(user, web_app, "Uses", "HTTPS")
Rel(web_app, api, "Calls", "JSON/HTTPS")
Rel(api, db, "Reads/Writes", "JDBC")
Rel(api, ext_sys, "Integrates with", "API/JSON")
SHOW_LEGEND()
@enduml`);
            await fs.writeFile(path.join(systemXDir, 'containers.md'), `# System X Container Diagram
This diagram zooms into System X, showing:
- **Web App**: Delivers the UI using React.
- **API**: Handles logic with Spring Boot.
- **Database**: Stores data in PostgreSQL.
- **External System**: Integrated via API/JSON.`);
            // Components
            await fs.writeFile(path.join(systemXDir, 'components.puml'), `@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Component.puml
title Component Diagram for System X API
Container_Boundary(api, "API") {
    Component(controller, "Controller", "Spring MVC", "Handles HTTP requests")
    Component(service, "Service", "Spring Bean", "Implements business logic")
    Component(repo, "Repository", "Spring Data", "Manages database access")
}
ContainerDb(db, "Database", "PostgreSQL", "Stores application data")
Rel(controller, service, "Uses")
Rel(service, repo, "Uses")
Rel(repo, db, "Reads/Writes", "JDBC")
SHOW_LEGEND()
@enduml`);
            await fs.writeFile(path.join(systemXDir, 'components.md'), `# System X API Component Diagram
This diagram details the API container:
- **Controller**: Handles HTTP requests.
- **Service**: Implements business logic.
- **Repository**: Manages database access.`);
            // Code
            await fs.writeFile(path.join(systemXDir, 'code.puml'), `@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Component.puml
title Code Diagram for System X API
package "API" {
    class "Controller" {
        + handleRequest()
    }
    class "Service" {
        + processLogic()
    }
    class "Repository" {
        + queryDatabase()
    }
}
Controller --> Service
Service --> Repository
@enduml`);
            await fs.writeFile(path.join(systemXDir, 'code.md'), `# System X Code Diagram
This diagram shows the class structure within the API:
- **Controller**: Handles HTTP requests.
- **Service**: Processes business logic.
- **Repository**: Queries the database.`);
            // Deployment
            await fs.writeFile(path.join(systemXDir, 'deployment.puml'), `@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Deployment.puml
title Deployment Diagram for System X
Deployment_Node(web_server, "Web Server", "AWS EC2", "Hosts the Web App") {
    Container(web_app, "Web App", "JavaScript, React", "Delivers UI")
}
Deployment_Node(api_server, "API Server", "AWS EC2", "Hosts the API") {
    Container(api, "API", "Java, Spring Boot", "Handles logic")
}
Deployment_Node(db_server, "Database Server", "AWS RDS", "Hosts the Database") {
    ContainerDb(db, "Database", "PostgreSQL", "Stores data")
}
Rel(web_app, api, "Calls", "JSON/HTTPS")
Rel(api, db, "Reads/Writes", "JDBC")
SHOW_LEGEND()
@enduml`);
            await fs.writeFile(path.join(systemXDir, 'deployment.md'), `# System X Deployment Diagram
This diagram shows the deployment topology:
- **Web Server**: Hosts the Web App on AWS EC2.
- **API Server**: Hosts the API on AWS EC2.
- **Database Server**: Hosts the Database on AWS RDS.`);
            // Documentation
            await fs.writeFile(path.join(systemXDir, 'documentation.md'), `# System X Documentation
## Overview
System X is designed to demonstrate the C4 model for architecture visualization.

## Architecture
The system follows a microservices architecture with a React frontend, Spring Boot API, and PostgreSQL database.

## Deployment
Deployed on AWS with EC2 and RDS.`);
        }
    } catch (err) {
        console.error('Error initializing diagrams directory:', err);
    }
}

// Load all systems from the diagrams directory
async function loadSystems() {
    const systems = {};
    try {
        const systemDirs = await fs.readdir(DIAGRAMS_DIR, { withFileTypes: true });
        for (const dir of systemDirs) {
            if (dir.isDirectory()) {
                const systemName = dir.name;
                const systemDir = path.join(DIAGRAMS_DIR, systemName);
                systems[systemName] = {
                    info: { md: await fs.readFile(path.join(systemDir, 'info.md'), 'utf8').catch(() => '') },
                    context: { puml: await fs.readFile(path.join(systemDir, 'context.puml'), 'utf8').catch(() => ''), md: await fs.readFile(path.join(systemDir, 'context.md'), 'utf8').catch(() => '') },
                    containers: { puml: await fs.readFile(path.join(systemDir, 'containers.puml'), 'utf8').catch(() => ''), md: await fs.readFile(path.join(systemDir, 'containers.md'), 'utf8').catch(() => '') },
                    components: { puml: await fs.readFile(path.join(systemDir, 'components.puml'), 'utf8').catch(() => ''), md: await fs.readFile(path.join(systemDir, 'components.md'), 'utf8').catch(() => '') },
                    code: { puml: await fs.readFile(path.join(systemDir, 'code.puml'), 'utf8').catch(() => ''), md: await fs.readFile(path.join(systemDir, 'code.md'), 'utf8').catch(() => '') },
                    deployment: { puml: await fs.readFile(path.join(systemDir, 'deployment.puml'), 'utf8').catch(() => ''), md: await fs.readFile(path.join(systemDir, 'deployment.md'), 'utf8').catch(() => '') },
                    documentation: { md: await fs.readFile(path.join(systemDir, 'documentation.md'), 'utf8').catch(() => '') }
                };
            }
        }
    } catch (err) {
        console.error('Error loading systems:', err);
    }
    return systems;
}

app.use(express.static(PUBLIC_DIR));
app.use(express.json());

// Initialize diagrams directory on startup
initializeDiagramsDir().then(() => {
    console.log('Diagrams directory initialized');
});

// Serve the workspace homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(VIEWS_DIR, 'index.html'));
});

// API to get all systems
app.get('/api/systems', async (req, res) => {
    const systems = await loadSystems();
    res.json(systems);
});

// API to add a new system
app.post('/api/systems', async (req, res) => {
    const { name } = req.body;
    const systemDir = path.join(DIAGRAMS_DIR, name);
    try {
        const systems = await loadSystems();
        if (name && !systems[name]) {
            await fs.mkdir(systemDir);
            await fs.writeFile(path.join(systemDir, 'info.md'), '');
            await fs.writeFile(path.join(systemDir, 'context.puml'), '');
            await fs.writeFile(path.join(systemDir, 'context.md'), '');
            await fs.writeFile(path.join(systemDir, 'containers.puml'), '');
            await fs.writeFile(path.join(systemDir, 'containers.md'), '');
            await fs.writeFile(path.join(systemDir, 'components.puml'), '');
            await fs.writeFile(path.join(systemDir, 'components.md'), '');
            await fs.writeFile(path.join(systemDir, 'code.puml'), '');
            await fs.writeFile(path.join(systemDir, 'code.md'), '');
            await fs.writeFile(path.join(systemDir, 'deployment.puml'), '');
            await fs.writeFile(path.join(systemDir, 'deployment.md'), '');
            await fs.writeFile(path.join(systemDir, 'documentation.md'), '');
            res.status(201).json({ message: 'System added', name });
        } else {
            res.status(400).json({ error: 'Invalid system name or system already exists' });
        }
    } catch (err) {
        console.error('Error adding system:', err);
        res.status(500).json({ error: 'Failed to add system' });
    }
});

// API to save a diagram
app.put('/api/systems/:system/:type', async (req, res) => {
    const { system, type } = req.params;
    const { puml, md } = req.body;
    const systemDir = path.join(DIAGRAMS_DIR, system);
    try {
        const systems = await loadSystems();
        if (systems[system] && ['info', 'context', 'containers', 'components', 'code', 'deployment', 'documentation'].includes(type)) {
            if (['context', 'containers', 'components', 'code', 'deployment'].includes(type)) {
                await fs.writeFile(path.join(systemDir, `${type}.puml`), puml || '');
                await fs.writeFile(path.join(systemDir, `${type}.md`), md || '');
            } else {
                await fs.writeFile(path.join(systemDir, `${type}.md`), md || '');
            }
            res.json({ message: 'Diagram saved' });
        } else {
            res.status(404).json({ error: 'System or diagram type not found' });
        }
    } catch (err) {
        console.error('Error saving diagram:', err);
        res.status(500).json({ error: 'Failed to save diagram' });
    }
});

// Preview endpoint for rendering PlantUML on the server
app.post('/preview', async (req, res) => {
    console.log('Received preview request:', req.body);
    const { pumlCode } = req.body;

    if (!pumlCode) {
        console.log('No PlantUML code provided');
        return res.status(400).json({ error: 'No PlantUML code provided.' });
    }

    try {
        const encoded = encodeURIComponent(pumlCode);
        const plantumlUrl = `http://www.plantuml.com/plantuml/svg/~h${Buffer.from(pumlCode).toString('hex')}`;
        console.log('Fetching SVG from PlantUML server:', plantumlUrl);

        const response = await fetch(plantumlUrl);
        if (!response.ok) {
            const errorText = await response.text();
            console.log('PlantUML server error response:', errorText);
            throw new Error(`PlantUML server responded with status ${response.status}: ${errorText}`);
        }
        const diagramSvg = await response.text();
        res.json({ svg: diagramSvg });
    } catch (procError) {
        console.error('Error rendering preview:', procError);
        res.status(500).json({ error: `Failed to render diagram: ${procError.message}` });
    }
});

// Dynamic diagram route (for drill-down and viewing)
app.get('/diagram/:system/:type', async (req, res) => {
    const { system, type } = req.params;
    const systems = await loadSystems();

    if (!systems[system] || !systems[system][type]) {
        return res.status(404).json({ error: `Diagram for ${system} (${type}) not found.` });
    }

    const data = systems[system][type];
    let diagramSvg = '';
    let content = '';

    if (['context', 'containers', 'components', 'code', 'deployment'].includes(type)) {
        const puml = data.puml || '';
        const md = data.md || '';
        diagramSvg = puml ? '<p class="has-text-danger">Error rendering diagram.</p>' : '';
        if (puml) {
            try {
                const encoded = encodeURIComponent(puml);
                const plantumlUrl = `http://www.plantuml.com/plantuml/svg/~h${Buffer.from(puml).toString('hex')}`;
                const response = await fetch(plantumlUrl);
                if (response.ok) {
                    diagramSvg = await response.text();
                }
            } catch (procError) {
                console.error(`Error rendering ${system} (${type}):`, procError);
                diagramSvg = `<p class="has-text-danger">Failed to render diagram: ${procError.message}</p>`;
            }
        }
        content = `
            <div class="columns">
                <div class="column is-two-thirds">
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
                <div class="column is-one-third">
                    <h2>Explanation</h2>
                    <div class="box explanation-content">${md}</div>
                    <h2>Diagram Code (PlantUML)</h2>
                    <div class="box">
                        <pre><code>${puml.replace(/</g, '<').replace(/>/g, '>')}</code></pre>
                    </div>
                </div>
            </div>
        `;
    } else {
        const md = data.md || '';
        content = `
            <div class="box">
                ${md}
            </div>
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
                        ${Object.keys(systems).map(s => `
                            <li><a href="/diagram/${s}/info"${s === system ? ' class="is-active"' : ''}>${s}</a></li>
                        `).join('')}
                    </ul>
                </aside>

                <!-- Main Content -->
                <div class="container is-fluid">
                    <h1 class="title mt-3">${system}</h1>
                    <h2 class="subtitle">${type.charAt(0).toUpperCase() + type.slice(1)}</h2>

                    <!-- Tabs -->
                    <div class="tabs mt-3">
                        <ul>
                            ${['info', 'context', 'containers', 'components', 'code', 'deployment', 'documentation'].map(t => `
                                <li${t === type ? ' class="is-active"' : ''}><a href="/diagram/${system}/${t}">${t.charAt(0).toUpperCase() + t.slice(1)}</a></li>
                            `).join('')}
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
    console.error('Unhandled error:', err.stack);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
    console.log(`ArchViz app listening at http://localhost:${port}`);
});