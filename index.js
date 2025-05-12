const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const port = 3000;

const VIEWS_DIR = path.join(__dirname, 'views');
const PUBLIC_DIR = path.join(__dirname, 'public');
const PLANTUML_JAR = path.join(__dirname, 'plantuml.jar');

// In-memory storage for systems
let systems = {
    "System X": {
        context: { 
            puml: "@startuml\n!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml\ntitle System Context Diagram for System X\nPerson(user, \"User\", \"A person interacting with System X\") [[/diagram/System X/context]]\nSystem(sys_x, \"System X\", \"The core application providing key functionality\") [[/diagram/System X/containers]]\nSystem_Ext(ext_sys, \"External System\", \"An external service providing data or functionality\")\nRel(user, sys_x, \"Uses\", \"HTTPS\")\nRel(sys_x, ext_sys, \"Integrates with\", \"API/JSON\")\nSHOW_LEGEND()\n@enduml", 
            md: "# System X Context Diagram\nThis diagram shows the high-level context of System X, including:\n- **User**: Interacts with System X via HTTPS.\n- **System X**: The core application.\n- **External System**: Provides data via API/JSON." 
        },
        containers: { 
            puml: "@startuml\n!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml\ntitle Container Diagram for System X\nPerson(user, \"User\", \"A person interacting with System X\")\nSystem_Boundary(c1, \"System X\") {\n    Container(web_app, \"Web App\", \"JavaScript, React\", \"Delivers the user interface\")\n    Container(api, \"API\", \"Java, Spring Boot\", \"Handles business logic and data\") [[/diagram/System X/components]]\n    ContainerDb(db, \"Database\", \"PostgreSQL\", \"Stores application data\")\n}\nSystem_Ext(ext_sys, \"External System\", \"Provides data or functionality\")\nRel(user, web_app, \"Uses\", \"HTTPS\")\nRel(web_app, api, \"Calls\", \"JSON/HTTPS\")\nRel(api, db, \"Reads/Writes\", \"JDBC\")\nRel(api, ext_sys, \"Integrates with\", \"API/JSON\")\nSHOW_LEGEND()\n@enduml", 
            md: "# System X Container Diagram\nThis diagram zooms into System X, showing:\n- **Web App**: Delivers the UI using React.\n- **API**: Handles logic with Spring Boot.\n- **Database**: Stores data in PostgreSQL.\n- **External System**: Integrated via API/JSON." 
        },
        components: { 
            puml: "@startuml\n!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Component.puml\ntitle Component Diagram for System X API\nContainer_Boundary(api, \"API\") {\n    Component(controller, \"Controller\", \"Spring MVC\", \"Handles HTTP requests\")\n    Component(service, \"Service\", \"Spring Bean\", \"Implements business logic\")\n    Component(repo, \"Repository\", \"Spring Data\", \"Manages database access\")\n}\nContainerDb(db, \"Database\", \"PostgreSQL\", \"Stores application data\")\nRel(controller, service, \"Uses\")\nRel(service, repo, \"Uses\")\nRel(repo, db, \"Reads/Writes\", \"JDBC\")\nSHOW_LEGEND()\n@enduml", 
            md: "# System X API Component Diagram\nThis diagram details the API container:\n- **Controller**: Handles HTTP requests.\n- **Service**: Implements business logic.\n- **Repository**: Manages database access." 
        }
    }
};

app.use(express.static(PUBLIC_DIR));
app.use(express.json());

// Serve the workspace homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(VIEWS_DIR, 'index.html'));
});

// API to get all systems
app.get('/api/systems', (req, res) => {
    res.json(systems);
});

// API to add a new system
app.post('/api/systems', (req, res) => {
    const { name } = req.body;
    if (name && !systems[name]) {
        systems[name] = {
            context: { puml: "", md: "" },
            containers: { puml: "", md: "" },
            components: { puml: "", md: "" }
        };
        res.status(201).json({ message: 'System added', name });
    } else {
        res.status(400).json({ error: 'Invalid system name or system already exists' });
    }
});

// API to save a diagram
app.put('/api/systems/:system/:type', (req, res) => {
    const { system, type } = req.params;
    const { puml, md } = req.body;
    if (systems[system] && systems[system][type]) {
        systems[system][type] = { puml, md };
        res.json({ message: 'Diagram saved' });
    } else {
        res.status(404).json({ error: 'System or diagram type not found' });
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
                            ${Object.keys(systems).map(s => `<a href="/diagram/${s}/context" class="nav-item ${s === system ? 'current' : ''}"><i class="fas fa-cube"></i> ${s}</a>`).join('')}
                        </div>
                    </nav>
                </aside>
                <main class="main-content">
                    <header>
                        <h1>${system} - ${type.charAt(0).toUpperCase() + type.slice(1)}</h1>
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
                            <pre><code>${puml.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
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