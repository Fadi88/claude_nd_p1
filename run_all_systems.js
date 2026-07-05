const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = 'C:\\Users\\fady8\\repos\\p1';
const classroomEnvPath = 'C:\\Users\\fady8\\repos\\cd14715-claude-code-classroom\\.env';

// 1. Read classroom env variables
let envVars = { ...process.env };
if (fs.existsSync(classroomEnvPath)) {
  const content = fs.readFileSync(classroomEnvPath, 'utf8');
  content.split('\n').forEach(line => {
    const parts = line.trim().split('=');
    if (parts.length === 2 && !parts[0].startsWith('#')) {
      envVars[parts[0].trim()] = parts[1].trim();
    }
  });
}

console.log('Loaded API variables from classroom root:');
console.log(`ANTHROPIC_API_KEY: ${envVars['ANTHROPIC_API_KEY'] ? 'SET' : 'MISSING'}`);
console.log(`ANTHROPIC_BASE_URL: ${envVars['ANTHROPIC_BASE_URL'] || 'None'}`);

const systems = [
  {
    name: 'System 1 (Agentic Loop)',
    dir: path.join(root, 'Build a Claims Intake Agent with a stop_reason-Driven Loop', 'exercises', '03-dynamic-decomposition', 'solution'),
    runCmd: 'python -m claims_intake.run --all --model claude-sonnet-4-5-20250929'
  },
  {
    name: 'System 2 (Context Strategy)',
    dir: path.join(root, 'Engineer a Long-Conversation Context Strategy for a Retail Support Copilot', '04-assemble-and-locate', 'solution'),
    runCmd: 'python -m retail_context.run --all'
  },
  {
    name: 'System 3 (Claude Code Config)',
    dir: path.join(root, 'Configure Claude Code for a Multi-Surface Monorepo Team', '04-plan-mode-and-explore-decision-doc', 'solution'),
    runCmd: 'python -m ecommerce_team_config .'
  },
  {
    name: 'System 4 (Orchestration)',
    dir: path.join(root, 'Build a Multi-Shift Quality Monitoring System with Claude Orchestration', '04-fork-scratchpad', 'solution'),
    runCmd: 'python -m shift_monitor run-shift --shift C --recorded-response fixtures/recorded_responses/shift_C_2026-04-30.json'
  }
];

// Helper to run a command in a directory
function run(cmd, dir, customEnv = {}) {
  console.log(`\nExecuting: ${cmd} in ${dir}`);
  try {
    const out = execSync(cmd, {
      cwd: dir,
      env: { ...envVars, ...customEnv },
      encoding: 'utf8',
      stdio: 'pipe'
    });
    return { success: true, stdout: out };
  } catch (err) {
    return { success: false, stdout: err.stdout, stderr: err.stderr, error: err.message };
  }
}

// Set up logs directory
const logsDir = path.join(root, 'evidence_logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Process each system
systems.forEach((sys, index) => {
  console.log(`\n========================================`);
  console.log(`Processing: ${sys.name}`);
  console.log(`========================================`);

  // 1. Create virtual environment
  const venvDir = path.join(sys.dir, '.venv');
  if (!fs.existsSync(venvDir)) {
    console.log('Creating virtual environment...');
    const venvResult = run('python -m venv .venv', sys.dir);
    if (!venvResult.success) {
      console.error('Failed to create venv:', venvResult.error);
      return;
    }
  }

  const pythonPath = path.join(venvDir, 'Scripts', 'python.exe');

  // 2. Install dependencies
  console.log('Installing package in editable dev mode...');
  const installResult = run(`"${pythonPath}" -m pip install -e ".[dev]"`, sys.dir);
  if (!installResult.success) {
    console.error('Failed to install dependencies:', installResult.error);
    return;
  }

  // Pin httpx < 0.28 to prevent proxies TypeError in older anthropic client constructors
  console.log('Pinning httpx < 0.28 to prevent proxies wrapper TypeError...');
  const httpxResult = run(`"${pythonPath}" -m pip install "httpx<0.28"`, sys.dir);
  if (!httpxResult.success) {
    console.error('Failed to pin httpx:', httpxResult.error);
    return;
  }

  // 3. Run unit tests
  console.log('Running test suite...');
  const testResult = run(`"${pythonPath}" -m pytest tests/ -v`, sys.dir);
  
  // Save test logs
  const testLogFile = path.join(logsDir, `system_${index + 1}_test_log.txt`);
  fs.writeFileSync(testLogFile, testResult.stdout || testResult.error, 'utf8');
  console.log(`Test logs saved to: ${testLogFile}`);
  console.log(`Tests status: ${testResult.success ? 'PASSED' : 'FAILED'}`);

  // 4. Run application command
  console.log('Running execution command...');
  const runCmdReal = sys.runCmd.replace('python', `"${pythonPath}"`);
  const runResult = run(runCmdReal, sys.dir);
  
  // Save execution logs
  const runLogFile = path.join(logsDir, `system_${index + 1}_run_log.txt`);
  fs.writeFileSync(runLogFile, runResult.stdout || runResult.error, 'utf8');
  console.log(`Execution logs saved to: ${runLogFile}`);
  console.log(`Execution status: ${runResult.success ? 'SUCCESS' : 'FAILED'}`);
});

console.log('\nAll systems processed successfully!');
