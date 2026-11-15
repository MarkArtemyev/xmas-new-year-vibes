import { build } from 'esbuild';
import { mkdir, cp, readFile, writeFile, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

await mkdir('dist', { recursive: true });
const common = { entryPoints: ['src/index.js'], bundle: true, target: ['es2020'], legalComments: 'eof', banner: {js:'/*! xmas-new-year-vibes v0.1.0 | MIT | Mark Artemyev */'} };
await build({ ...common, outfile:'dist/winter-vibes.js', format:'esm' });
await build({ ...common, outfile:'dist/winter-vibes.min.js', format:'iife', globalName:'WinterVibes', minify:true });
await cp('src/winter-vibes.d.ts','dist/winter-vibes.d.ts');
await cp('src/extras.d.ts','dist/extras.d.ts');
await writeFile('dist/winter-vibes.d.ts',(await readFile('dist/winter-vibes.d.ts','utf8'))+'\nexport { registerWinterComponents } from "./extras.js";\n');
for (const name of ['index.html','styles.css','app.js']) await cp('demo/'+name,'dist/'+name);
for (const name of ['kitschmas.html','kitschmas.css','kitschmas.js']) await cp('demo/'+name,'dist/'+name);
await cp('demo/assets','dist/assets',{recursive:true});
await cp('LICENSE','dist/LICENSE');
const min = await readFile('dist/winter-vibes.min.js');
const sizes = {version:'0.1.0',rawBytes:min.length,gzipBytes:gzipSync(min).length};
await writeFile('dist/size.json',JSON.stringify(sizes,null,2)+'\n');
console.log('Built winter kit:',sizes);
