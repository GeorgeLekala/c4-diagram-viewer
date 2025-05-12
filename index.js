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
            // Initialize with "System X"
            const systemXDir = path.join(DIAGRAMS_DIR, 'System X');
            await fs.mkdir(systemXDir);
            await fs.writeFile(path.join(systemXDir, 'context.puml'), `@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml
title System Context Diagram for System X
Person(user, "User", "A person interacting with System X") [[/diagram/System X/context]]
System(sys_x, "System X", "The core application providing key functionality") [[/diagram/System X/containers]]
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
            await fs.writeFile(path.join(systemXDir, 'containers.puml'), `@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml
title Container Diagram for System X
Person(user, "User", "A person interacting with System X")
System_Boundary(c1, "System X") {
    Container(web_app, "Web App", "JavaScript, React", "Delivers the user interface")
    Container(api, "API", "Java, Spring Boot", "Handles business logic and data") [[/diagram/System X/components]]
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
                    context: {
                        puml: await fs.readFile(path.join(systemDir, 'context.puml'), 'utf8').catch(() => ''),
                        md: await fs.readFile(path.join(systemDir, 'context.md'), 'utf8').catch(() => '')
                    },
                    containers: {
                        puml: await fs.readFile(path.join(systemDir, 'containers.puml'), 'utf8').catch(() => ''),
                        md: await fs.readFile(path.join(systemDir, 'containers.md'), 'utf8').catch(() => '')
                    },
                    components: {
                        puml: await fs.readFile(path.join(systemDir, 'components.puml'), 'utf8').catch(() => ''),
                        md: await fs.readFile(path.join(systemDir, 'components.md'), 'utf8').catch(() => '')
                    }
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
            await fs.writeFile(path.join(systemDir, 'context.puml'), '');
            await fs.writeFile(path.join(systemDir, 'context.md'), '');
            await fs.writeFile(path.join(systemDir, 'containers.puml'), '');
            await fs.writeFile(path.join(systemDir, 'containers.md'), '');
            await fs.writeFile(path.join(systemDir, 'components.puml'), '');
            await fs.writeFile(path.join(systemDir, 'components.md'), '');
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
        if (systems[system] && ['context', 'containers', 'components'].includes(type)) {
            await fs.writeFile(path.join(systemDir, `${type}.puml`), puml);
            await fs.writeFile(path.join(systemDir, `${type}.md`), md);
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
            throw new Error(`PlantUML server responded with status ${response.status}`);
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
        return res.status(404).send(`Diagram for ${system} (${type}) not found.`);
    }

    const { puml, md } = systems[system][type];
    let diagramSvg = '<p style="color:red;">Error rendering diagram.</p>';

    try {
        const encoded = encodeURIComponent(puml);
        const plantumlUrl = `http://www.plantuml.com/plantuml/svg/~h${Buffer.from(puml).toString('hex')}`;
        const response = await fetch(plantumlUrl);
        if (response.ok) {
            diagramSvg = await response.text();
        }
    } catch (procError) {
        console.error(`Error rendering ${system} (${type}):`, procError);
        diagramSvg = `<p style="color:red;">Failed to render diagram: ${procError.message}</p>`;
    }

    const htmlTemplate = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="stylesheet" href="/style.css">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
            <title>ArchViz - ${system} (${type.charAt(0).toUpperCase() + type.slice(1)})</title>
        </head>
        <body>
            <div class="app-container">
                <aside class="sidebar">
                    <div class="sidebar-header">
                        <h2><i class="fas fa-sitemap"></i> ArchViz</h2>
                    </div>
                    <nav class="sidebar-nav">
                        <a href="/" class="nav-item"><i class="fas fa-home"></i> Home</a>
                        <div id="systems-nav" class="nav-group">
                            ${Object.keys(systems).map(s => `
                                <div class="nav-system">
                                    <span class="nav-system-title"><i class="fas fa-cube"></i> ${s}</span>
                                    <div class="nav-system-types">
                                        ${['context', 'containers', 'components'].map(t => `
                                            <a href="/diagram/${s}/${t}" class="nav-item nav-subitem ${s === system && t === type ? 'current' : ''}">
                                                <i class="fas fa-diagram-project"></i> ${t.charAt(0).toUpperCase() + t.slice(1)}
                                            </a>
                                        `).join('')}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </nav>
                </aside>
                <main class="main-content">
                    <header>
                        <h1>${system} - ${type.charAt(0).toUpperCase() + type.slice(1)}</h1>
                        <nav class="diagram-nav">
                            ${['context', 'containers', 'components'].map(t => `
                                <a href="/diagram/${system}/${t}" class="${t === type ? 'active' : ''}">
                                    ${t.charAt(0).toUpperCase() + t.slice(1)}
                                </a>
                            `).join(' | ')}
                        </nav>
                    </header>
                    <div class="content">
                        <div class="column diagram-column">
                            <h2>Rendered Diagram</h2>
                            <div class="diagram-output">${diagramSvg}</div>
                        </div>
                        <div class="column explanation-column">
                            <h2>Explanation</h2>
                            <div class="explanation-content">${md}</div>
                        </div>
                        <div class="column code-column">
                            <h2>Diagram Code (PlantUML)</h2>
                            <pre><code>${puml.replace(/</g, '<').replace(/>/g, '>')}</code></pre>
                        </div>
                    </div>
                </main>
            </div>
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