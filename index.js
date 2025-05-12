const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const port = 3000;

const VIEWS_DIR = path.join(__dirname, 'views');
const PUBLIC_DIR = path.join(__dirname, 'public');
const PLANTUML_JAR = path.join(__dirname, 'plantuml.jar');

app.use(express.static(PUBLIC_DIR));
app.use(express.json()); // Parse JSON request bodies

// Serve the workspace homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(VIEWS_DIR, 'index.html'));
});

// Preview endpoint for rendering PlantUML on the server
app.post('/preview', async (req, res) => {
    console.log('Received preview request:', req.body); // Debug log
    const { pumlCode } = req.body;

    if (!pumlCode) {
        console.log('No PlantUML code provided');
        return res.status(400).json({ error: 'No PlantUML code provided.' });
    }

    let svgOutput = '';
    let stderrOutput = '';

    try {
        console.log('Spawning PlantUML process with jar:', PLANTUML_JAR);
        const plantumlProcess = spawn('java', ['-jar', PLANTUML_JAR, '-tsvg', '-pipe'], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        plantumlProcess.stdout.on('data', (data) => {
            svgOutput += data.toString();
            console.log('PlantUML stdout:', data.toString()); // Debug log
        });

        plantumlProcess.stderr.on('data', (data) => {
            stderrOutput += data.toString();
            console.log('PlantUML stderr:', data.toString()); // Debug log
        });

        const processPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                plantumlProcess.kill();
                reject(new Error('PlantUML process timed out after 10 seconds.'));
            }, 10000);

            plantumlProcess.on('close', (code) => {
                clearTimeout(timeout);
                console.log('PlantUML process exited with code:', code);
                if (code === 0 && svgOutput.includes('<svg')) {
                    resolve(svgOutput);
                } else {
                    reject(new Error(`PlantUML exited with code ${code}. Error: ${stderrOutput || 'Invalid SVG output'}`));
                }
            });

            plantumlProcess.on('error', (err) => {
                clearTimeout(timeout);
                reject(new Error(`Failed to start PlantUML: ${err.message}`));
            });
        });

        plantumlProcess.stdin.write(pumlCode);
        plantumlProcess.stdin.end();

        const diagramSvg = await processPromise;
        res.json({ svg: diagramSvg });
    } catch (procError) {
        console.error('Error rendering preview:', procError);
        res.status(500).json({ error: `Failed to render diagram: ${procError.message}` });
    }
});

// Dynamic diagram route (for drill-down and editing)
app.get('/diagram/:system/:type', async (req, res) => {
    const { system, type } = req.params;
    let systems = {}; // In-memory storage (replace with file/DB later)
    // Example: Load System X initially
    systems["System X"] = {
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
    };

    if (!systems[system] || !systems[system][type]) {
        return res.status(404).send(`Diagram for ${system} (${type}) not found.`);
    }

    const { puml, md } = systems[system][type];
    let diagramSvg = '<p style="color:red;">Error rendering diagram.</p>';

    try {
        const plantumlProcess = spawn('java', ['-jar', PLANTUML_JAR, '-tsvg', '-pipe'], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let svgOutput = '';
        let stderrOutput = '';

        plantumlProcess.stdout.on('data', (data) => {
            svgOutput += data.toString();
        });

        plantumlProcess.stderr.on('data', (data) => {
            stderrOutput += data.toString();
        });

        const processPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                plantumlProcess.kill();
                reject(new Error('PlantUML process timed out after 10 seconds.'));
            }, 10000);

            plantumlProcess.on('close', (code) => {
                clearTimeout(timeout);
                if (code === 0 && svgOutput.includes('<svg')) {
                    resolve(svgOutput);
                } else {
                    reject(new Error(`PlantUML exited with code ${code}. Error: ${stderrOutput || 'Invalid SVG output'}`));
                }
            });

            plantumlProcess.on('error', (err) => {
                clearTimeout(timeout);
                reject(new Error(`Failed to start PlantUML: ${err.message}`));
            });
        });

        plantumlProcess.stdin.write(puml);
        plantumlProcess.stdin.end();

        diagramSvg = await processPromise;
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
            <title>ArchViz - ${system} (${type.charAt(0).toUpperCase() + type.slice(1)})</title>
        </head>
        <body>
            <div class="container">
                <header>
                    <div class="branding">ArchViz</div>
                    <h1>${system} (${type.charAt(0).toUpperCase() + type.slice(1)})</h1>
                    <nav>
                        <a href="/">Home</a> |
                        <a href="/diagram/${system}/context">Context</a> |
                        <a href="/diagram/${system}/containers">Containers</a> |
                        <a href="/diagram/${system}/components">Components</a>
                    </nav>
                </header>
                <main class="content">
                    <div class="column diagram-column">
                        <h2>Rendered Diagram</h2>
                        <div class="diagram-output">
                            ${diagramSvg}
                        </div>
                    </div>
                    <div class="column explanation-column">
                        <h2>Explanation</h2>
                        <div class="explanation-content">
                            ${md}
                        </div>
                    </div>
                    <div class="column code-column">
                        <h2>Diagram Code (PlantUML)</h2>
                        <pre><code>${puml.replace(/</g, '<').replace(/>/g, '>')}</code></pre>
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