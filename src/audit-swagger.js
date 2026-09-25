import YAML from 'yamljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const doc = YAML.load(path.join(__dirname, '../docs/swagger.yaml'));
const paths = doc.paths;

console.log(`\n📊 TOTAL UNIQUE SWAGGER PATHS: ${Object.keys(paths).length}\n`);

const summary = {};
let totalOps = 0;

for (const [routePath, methods] of Object.entries(paths)) {
  for (const [method, op] of Object.entries(methods)) {
    if (typeof op !== 'object') continue;
    totalOps++;
    const tag = (op.tags && op.tags[0]) || 'default';
    if (!summary[tag]) summary[tag] = [];
    summary[tag].push({
      method: method.toUpperCase(),
      path: routePath,
      summary: op.summary || 'No summary',
    });
  }
}

console.log(`🚀 TOTAL SWAGGER API OPERATIONS: ${totalOps}\n`);

for (const [tag, endpoints] of Object.entries(summary)) {
  console.log(`📁 ${tag.toUpperCase()} (${endpoints.length} APIs):`);
  endpoints.forEach((e) => {
    console.log(`   [${e.method.padEnd(6)}] ${e.path.padEnd(35)} -> ${e.summary}`);
  });
  console.log('');
}
