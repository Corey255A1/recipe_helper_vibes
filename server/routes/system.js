const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const execAsync = util.promisify(exec);

const REPO_DIR = path.join(__dirname, '..', '..');

async function runGit(args) {
  const { stdout, stderr } = await execAsync(`git ${args}`, {
    cwd: REPO_DIR,
    timeout: 20000
  });
  return { stdout: stdout.trim(), stderr: stderr.trim() };
}

router.get('/status', async (req, res) => {
  try {
    await runGit(`config --global --add safe.directory "${REPO_DIR}"`).catch(() => {});

    const [hashRes, branchRes, subjectRes, dateRes] = await Promise.all([
      runGit('rev-parse --short HEAD').catch(() => ({ stdout: 'unknown' })),
      runGit('rev-parse --abbrev-ref HEAD').catch(() => ({ stdout: 'main' })),
      runGit('log -1 --pretty=%s').catch(() => ({ stdout: '' })),
      runGit('log -1 --pretty=%ci').catch(() => ({ stdout: '' }))
    ]);

    let behindCount = 0;
    let remoteStatus = 'up_to_date';
    let remoteError = null;

    if (req.query.fetch === 'true') {
      try {
        await runGit('fetch --quiet');
      } catch (fetchErr) {
        remoteError = fetchErr.message;
      }
    }

    try {
      const countRes = await runGit('rev-list HEAD..@{u} --count');
      behindCount = parseInt(countRes.stdout, 10) || 0;
      if (behindCount > 0) {
        remoteStatus = 'updates_available';
      }
    } catch (e) {
      remoteStatus = 'unknown';
    }

    res.json({
      status: 'online',
      commit: hashRes.stdout,
      branch: branchRes.stdout,
      lastCommitMessage: subjectRes.stdout,
      lastCommitDate: dateRes.stdout,
      behindCount,
      remoteStatus,
      remoteError,
      uptimeSeconds: Math.floor(process.uptime())
    });
  } catch (error) {
    res.json({
      status: 'online',
      commit: 'unknown',
      branch: 'unknown',
      error: error.message,
      uptimeSeconds: Math.floor(process.uptime())
    });
  }
});

router.post('/update', async (req, res, next) => {
  try {
    await runGit(`config --global --add safe.directory "${REPO_DIR}"`).catch(() => {});

    const logs = [];
    const oldHash = (await runGit('rev-parse --short HEAD').catch(() => ({ stdout: 'unknown' }))).stdout;
    logs.push(`Current commit: ${oldHash}`);

    // Pull latest code from git
    let pullOut;
    try {
      pullOut = await runGit('pull --rebase --autostash');
      logs.push(pullOut.stdout || 'git pull completed.');
    } catch (pullErr) {
      // If rebase conflicts on local network appliance, fall back to fetch + reset to upstream if force=true
      if (req.body && req.body.force) {
        await runGit('rebase --abort').catch(() => {});
        await runGit('fetch origin');
        const branch = (await runGit('rev-parse --abbrev-ref HEAD').catch(() => ({ stdout: 'main' }))).stdout || 'main';
        const resetOut = await runGit(`reset --hard origin/${branch}`);
        logs.push(`Force synced to origin/${branch}: ${resetOut.stdout}`);
      } else {
        throw new Error(`Git pull failed: ${pullErr.stderr || pullErr.message}`);
      }
    }

    const newHash = (await runGit('rev-parse --short HEAD').catch(() => ({ stdout: 'unknown' }))).stdout;
    const newSubject = (await runGit('log -1 --pretty=%s').catch(() => ({ stdout: '' }))).stdout;

    // Check if package.json changed between oldHash and newHash
    if (oldHash !== 'unknown' && newHash !== 'unknown' && oldHash !== newHash) {
      try {
        const diffRes = await runGit(`diff --name-only ${oldHash} ${newHash}`);
        if (diffRes.stdout.includes('package.json')) {
          logs.push('package.json changed — running npm install --omit=dev...');
          const npmRes = await execAsync('npm install --omit=dev', { cwd: REPO_DIR, timeout: 60000 });
          logs.push(npmRes.stdout.trim());
        }
      } catch (e) {
        logs.push(`Warning checking dependencies: ${e.message}`);
      }
    }

    const shouldRestart = req.body?.restart !== false;
    res.json({
      success: true,
      updated: oldHash !== newHash,
      oldCommit: oldHash,
      newCommit: newHash,
      lastCommitMessage: newSubject,
      restarting: shouldRestart,
      logs: logs.join('\n')
    });

    if (shouldRestart) {
      console.log('[SYSTEM UPDATE] Exiting server process so supervisor/container restarts with new code...');
      setTimeout(() => {
        process.exit(0);
      }, 600);
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
