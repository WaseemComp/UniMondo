import {createJiti} from 'jiti';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
export function mediaJiti() {
  const root=fileURLToPath(new URL('../',import.meta.url)),mock=fileURLToPath(new URL('./fixtures/media-services.mjs',import.meta.url));
  const alias={'@':`${root}src`,'next/cache':mock,'next/navigation':mock};
  for(const name of ['admin','server','server-auth'])for(const path of [`@/lib/supabase/${name}`,`${root}src/lib/supabase/${name}`,`${root}src/lib/supabase/${name}.ts`])alias[path]=mock;
  return createJiti(import.meta.url,{jsx:{runtime:'automatic'},alias,fsCache:false,moduleCache:false,tryNative:false});
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const path=fileURLToPath(new URL('./test-media-library.mjs',import.meta.url));
  await mediaJiti().evalModule(readFileSync(path,'utf8'),{filename:path,async:true});
}
