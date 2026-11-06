import fs from 'fs';
import path from 'path';
const APPS = [
    {
        name: 'storefront',
        dir: path.resolve(process.cwd(), 'apps/storefront/src/app'),
        baseUrl: 'http://127.0.0.1:3000',
    },
    {
        name: 'admin',
        dir: path.resolve(process.cwd(), 'apps/admin/src/app'),
        baseUrl: 'http://127.0.0.1:3001',
    },
    {
        name: 'delivery',
        dir: path.resolve(process.cwd(), 'apps/delivery/src/app'),
        baseUrl: 'http://127.0.0.1:3002',
    },
];
// Parameter replacements for realistic routing
function resolveDynamicParams(app, rawPath) {
    let resolved = rawPath;
    // Storefront dynamic mappings
    if (app === 'storefront') {
        resolved = resolved.replace(/\[id\]/g, 'b1000000-0000-0000-0000-000000000001');
        resolved = resolved.replace(/\[slug\]/g, 'hoodies');
    }
    // Admin dynamic mappings
    if (app === 'admin') {
        resolved = resolved.replace(/inventory\/\[id\]/g, 'inventory/b1000000-0000-0000-0000-000000000001');
        resolved = resolved.replace(/invoice\/\[id\]/g, 'invoice/ord-10000000-0000-0000-0000-000000000001');
        resolved = resolved.replace(/\[id\]/g, 'ord-10000000-0000-0000-0000-000000000001');
    }
    // Delivery dynamic mappings
    if (app === 'delivery') {
        resolved = resolved.replace(/bolt-session\/\[orderId\]/g, 'bolt-session/ord-10000000-0000-0000-0000-000000000001');
        resolved = resolved.replace(/\[orderId\]/g, 'ord-10000000-0000-0000-0000-000000000001');
        resolved = resolved.replace(/order\/\[id\]/g, 'order/ord-10000000-0000-0000-0000-000000000001');
        resolved = resolved.replace(/\[id\]/g, 'ord-10000000-0000-0000-0000-000000000001');
    }
    // Catch-all fallbacks
    resolved = resolved.replace(/\[\.\.\.[^\]]+\]/g, 'sample-catchall');
    resolved = resolved.replace(/\[\[\.\.\.[^\]]+\]\]/g, '');
    resolved = resolved.replace(/\[[^\]]+\]/g, 'test-param');
    // Specific query string helpers for API routes
    if (resolved.includes('api/bolt/check-pincode')) {
        resolved = `${resolved}?pin=560038`;
    }
    return resolved;
}
// Convert file system directory to Next.js App Router URL path
function dirToUrlPath(app, relativeDir) {
    // Normalize Windows backslashes
    const normalized = relativeDir.replace(/\\/g, '/');
    const segments = normalized.split('/').filter(Boolean);
    // Remove route groups like (dashboard), (auth), etc.
    const routeSegments = segments.filter((seg) => !seg.startsWith('(') || !seg.endsWith(')'));
    const rawPath = routeSegments.length > 0 ? `/${routeSegments.join('/')}` : '/';
    return resolveDynamicParams(app, rawPath);
}
// Recursively discover routes
function scanDirectory(app, baseDir, currentDir = '') {
    const fullPath = path.join(baseDir, currentDir);
    if (!fs.existsSync(fullPath))
        return [];
    const entries = fs.readdirSync(fullPath, { withFileTypes: true });
    const routes = [];
    let hasPage = false;
    let hasRoute = false;
    for (const entry of entries) {
        if (entry.isFile()) {
            if (/^page\.(tsx|jsx|js|ts)$/.test(entry.name)) {
                hasPage = true;
            }
            else if (/^route\.(ts|js)$/.test(entry.name)) {
                hasRoute = true;
            }
        }
        else if (entry.isDirectory()) {
            // Recurse into subdirectories (ignore _components, _lib, etc. if prefixed with _)
            if (!entry.name.startsWith('_')) {
                const subRoutes = scanDirectory(app, baseDir, path.join(currentDir, entry.name));
                routes.push(...subRoutes);
            }
        }
    }
    const appConfig = APPS.find((a) => a.name === app);
    if (hasPage) {
        const routePath = dirToUrlPath(app, currentDir);
        routes.unshift({
            app,
            type: 'frontend',
            filePath: path.join(fullPath, 'page.tsx'),
            routePath,
            testUrl: `${appConfig.baseUrl}${routePath}`,
        });
    }
    if (hasRoute) {
        const routePath = dirToUrlPath(app, currentDir);
        routes.unshift({
            app,
            type: 'api',
            filePath: path.join(fullPath, 'route.ts'),
            routePath,
            testUrl: `${appConfig.baseUrl}${routePath}`,
        });
    }
    return routes;
}
// Ping an individual route
async function pingRoute(route) {
    const startTime = Date.now();
    // For frontend routes, we issue a standard GET with an Accept header.
    if (route.type === 'frontend') {
        try {
            const res = await fetch(route.testUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'User-Agent': 'AtelierRouteAuditBot/1.0',
                },
                redirect: 'manual', // do not auto-follow to detect auth redirects cleanly
            });
            const durationMs = Date.now() - startTime;
            const status = res.status;
            let verdict = 'PASS';
            let errorSnippet;
            // 200, 301, 302, 307, 308 (auth redirects), 401, 403 are all healthy/valid responses
            if (status >= 200 && status < 400) {
                verdict = 'PASS';
            }
            else if (status === 401 || status === 403) {
                verdict = 'PASS';
            }
            else if (status === 404) {
                verdict = 'MISSING';
            }
            else {
                verdict = 'FAIL';
                try {
                    const text = await res.text();
                    errorSnippet = text.slice(0, 300).replace(/\n/g, ' ');
                }
                catch {
                    errorSnippet = 'Could not read response body';
                }
            }
            return {
                app: route.app,
                type: route.type,
                filePath: route.filePath,
                routePath: route.routePath,
                testUrl: route.testUrl,
                method: 'GET',
                status,
                statusText: res.statusText,
                verdict,
                durationMs,
                errorSnippet,
            };
        }
        catch (err) {
            const durationMs = Date.now() - startTime;
            const message = err instanceof Error ? err.message : String(err);
            return {
                app: route.app,
                type: route.type,
                filePath: route.filePath,
                routePath: route.routePath,
                testUrl: route.testUrl,
                method: 'GET',
                status: 0,
                statusText: 'CONNECTION_ERROR',
                verdict: 'FAIL',
                durationMs,
                errorSnippet: message,
            };
        }
    }
    // For API routes, test GET first. If 405 Method Not Allowed, fallback to POST with empty payload.
    try {
        let method = 'GET';
        let res = await fetch(route.testUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'AtelierRouteAuditBot/1.0',
            },
            redirect: 'manual',
        });
        if (res.status === 405) {
            method = 'POST';
            res = await fetch(route.testUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'AtelierRouteAuditBot/1.0',
                },
                body: JSON.stringify({}),
                redirect: 'manual',
            });
        }
        const durationMs = Date.now() - startTime;
        const status = res.status;
        let verdict = 'PASS';
        let errorSnippet;
        // For APIs: 200, 201, 204, 301, 302, 307, 308, 400 (bad input on mock payload), 401 (auth), 403 (role) are all healthy
        if ((status >= 200 && status < 400) || status === 400 || status === 401 || status === 403) {
            verdict = 'PASS';
        }
        else if (status === 404) {
            verdict = 'MISSING';
        }
        else {
            verdict = 'FAIL';
            try {
                const text = await res.text();
                errorSnippet = text.slice(0, 300).replace(/\n/g, ' ');
            }
            catch {
                errorSnippet = 'Could not read response body';
            }
        }
        return {
            app: route.app,
            type: route.type,
            filePath: route.filePath,
            routePath: route.routePath,
            testUrl: route.testUrl,
            method,
            status,
            statusText: res.statusText,
            verdict,
            durationMs,
            errorSnippet,
        };
    }
    catch (err) {
        const durationMs = Date.now() - startTime;
        const message = err instanceof Error ? err.message : String(err);
        return {
            app: route.app,
            type: route.type,
            filePath: route.filePath,
            routePath: route.routePath,
            testUrl: route.testUrl,
            method: 'GET',
            status: 0,
            statusText: 'CONNECTION_ERROR',
            verdict: 'FAIL',
            durationMs,
            errorSnippet: message,
        };
    }
}
async function runAudit() {
    console.log('🔍 ATELIER MONOREPO: Starting Exhaustive Route Audit...\n');
    const allRoutes = [];
    for (const app of APPS) {
        const routes = scanDirectory(app.name, app.dir);
        console.log(`📁 Discovered ${routes.length} routes in apps/${app.name}`);
        allRoutes.push(...routes);
    }
    console.log(`\n🚀 Executing automated health checks across ${allRoutes.length} total routes...\n`);
    const results = [];
    for (const route of allRoutes) {
        process.stdout.write(`Testing [${route.app.toUpperCase()}] ${route.type.toUpperCase()} ${route.routePath} ... `);
        const result = await pingRoute(route);
        results.push(result);
        const symbol = result.verdict === 'PASS'
            ? '🟢 PASS'
            : result.verdict === 'MISSING'
                ? '🟡 404'
                : '🔴 FAIL';
        console.log(`${symbol} (${result.method} ${result.status} in ${result.durationMs}ms)`);
        if (result.errorSnippet) {
            console.log(`   ↳ Error: ${result.errorSnippet}`);
        }
    }
    // Calculate statistics
    const total = results.length;
    const passed = results.filter((r) => r.verdict === 'PASS').length;
    const failed = results.filter((r) => r.verdict === 'FAIL').length;
    const missing = results.filter((r) => r.verdict === 'MISSING').length;
    const passRate = ((passed / total) * 100).toFixed(1);
    console.log('\n==================================================');
    console.log(`AUDIT COMPLETE: ${passed}/${total} PASS (${passRate}%) | ${failed} FAIL | ${missing} MISSING`);
    console.log('==================================================\n');
    // Generate route-health-report.md
    let report = `# Atelier Monorepo: Route Health Audit Report\n\n`;
    report += `*Generated automatically on: ${new Date().toISOString()}*\n\n`;
    report += `## Executive Summary\n\n`;
    report += `- **Total Routes Tested**: \`${total}\`\n`;
    report += `- 🟢 **PASS**: \`${passed}\` (${passRate}%)\n`;
    report += `- 🔴 **FAIL**: \`${failed}\`\n`;
    report += `- 🟡 **MISSING / 404**: \`${missing}\`\n\n`;
    report += `## Health Status Overview\n\n`;
    report += `| Metric | Count | Health Status |\n`;
    report += `| :--- | :--- | :--- |\n`;
    report += `| 🟢 Validated (200, 30x, 401, 403) | **${passed}** | Healthy & Responsive |\n`;
    report += `| 🔴 Server Errors (500, Crashes) | **${failed}** | ${failed === 0 ? 'Zero Regressions' : 'Requires Attention'} |\n`;
    report += `| 🟡 Missing / Unmapped (404) | **${missing}** | ${missing === 0 ? 'Zero Missing' : 'Check Dynamic Route Param'} |\n\n`;
    for (const app of APPS) {
        const appResults = results.filter((r) => r.app === app.name);
        report += `### Application: \`apps/${app.name}\` (${app.baseUrl})\n\n`;
        report += `| Type | Route Path | Method | HTTP Status | Verdict | Duration |\n`;
        report += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
        for (const r of appResults) {
            const badge = r.verdict === 'PASS'
                ? '🟢 PASS'
                : r.verdict === 'MISSING'
                    ? '🟡 404'
                    : '🔴 FAIL';
            const statusLabel = r.status === 0 ? 'CONN_ERR' : `${r.status} ${r.statusText}`;
            report += `| \`${r.type}\` | \`${r.routePath}\` | \`${r.method}\` | \`${statusLabel}\` | ${badge} | \`${r.durationMs}ms\` |\n`;
        }
        report += `\n`;
        // Include error log details if any route failed
        const appFails = appResults.filter((r) => r.verdict === 'FAIL' || r.verdict === 'MISSING');
        if (appFails.length > 0) {
            report += `#### Issues Detected in \`apps/${app.name}\`:\n\n`;
            for (const fail of appFails) {
                report += `- **Route**: \`${fail.method} ${fail.testUrl}\` (\`${fail.filePath}\`)\n`;
                report += `  - **Status**: \`${fail.status} ${fail.statusText}\`\n`;
                report += `  - **Details**: \`${fail.errorSnippet || 'None'}\`\n\n`;
            }
        }
    }
    const reportPath = path.resolve(process.cwd(), 'route-health-report.md');
    fs.writeFileSync(reportPath, report, 'utf8');
    console.log(`📄 Comprehensive report saved to: ${reportPath}`);
}
runAudit().catch((err) => {
    console.error('Fatal audit failure:', err);
    process.exit(1);
});
