// Simulated DOM interaction checks, not a replacement for Safari layout/visual QA.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createJiti} from 'jiti';
import {mediaJiti} from './run-media-tests.mjs';
import {mediaFixture} from './fixtures/media-fixture.mjs';
const require=createRequire(import.meta.url),root=fileURLToPath(new URL('../',import.meta.url));
const {JSDOM}=require(process.env.JSDOM_MODULE||'jsdom');
const dom=new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>',{url:'http://localhost/admin/home',pretendToBeVisual:true});
for(const key of ['window','document','HTMLElement','Element','HTMLInputElement','HTMLTextAreaElement','HTMLSelectElement','HTMLButtonElement','HTMLIFrameElement','MutationObserver','Event','MouseEvent','KeyboardEvent','getComputedStyle'])Object.defineProperty(globalThis,key,{value:typeof dom.window[key]==='function'&&key==='getComputedStyle'?dom.window[key].bind(dom.window):dom.window[key],configurable:true,writable:true});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;globalThis.requestAnimationFrame=dom.window.requestAnimationFrame.bind(dom.window);globalThis.cancelAnimationFrame=dom.window.cancelAnimationFrame.bind(dom.window);
class ResizeObserver {observe(element){this.element=element;}disconnect(){}}
class IntersectionObserver {observe(){}unobserve(){}disconnect(){}}
for(const [key,value]of Object.entries({ResizeObserver,IntersectionObserver,matchMedia:()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}})})){globalThis[key]=value;dom.window[key]=value;}
dom.window.HTMLElement.prototype.scrollIntoView=function(){};dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true};dom.window.HTMLDialogElement.prototype.close=function(){this.open=false};dom.window.confirm=()=>true;
const iframeObserver=new dom.window.MutationObserver(()=>{for(const frame of document.querySelectorAll('iframe[srcdoc]'))if(!frame.dataset.testInitialized){frame.dataset.testInitialized='true';const doc=frame.contentDocument;doc.open();doc.write(frame.getAttribute('srcdoc'));doc.close();frame.dispatchEvent(new dom.window.Event('load'));}});iframeObserver.observe(document.body,{childList:true,subtree:true});
mediaFixture();const server=mediaJiti();
const hero=await server.import(root+'src/app/admin/cms/homepage-editor-actions.ts'),items=await server.import(root+'src/app/admin/cms/homepage-items-actions.ts'),stories=await server.import(root+'src/app/admin/cms/homepage-story-actions.ts');
globalThis.__homepageItemsActions={...hero,...items,...stories};
const media=await server.import(root+'src/app/api/admin/media/route.ts');const mediaItem=await server.import(root+'src/app/api/admin/media/[id]/route.ts');
globalThis.fetch=async(input,options={})=>{const url=new URL(typeof input==='string'?input:input.url,'http://localhost');assert.equal(url.hostname,'localhost','No external DOM-test fetch');assert(url.pathname.startsWith('/api/admin/media'),'Only isolated media APIs may be fetched');const request=new Request(url,{...options});const id=url.pathname.split('/')[4];return id?mediaItem.GET(request,{params:Promise.resolve({id})}):media.GET(request);};dom.window.fetch=globalThis.fetch;
const mock=root+'scripts/fixtures/homepage-items-dom-services.mjs',elements=root+'scripts/fixtures/homepage-items-dom-elements.mjs';
const alias={'./homepage-editor.css':mock,'./media-library.css':mock,'@':root+'src','next/link':elements+'?link','next/image':elements,'@/lib/supabase/browser':mock};
// A separate simple link module avoids conflating the image and link default exports.
const link=root+'scripts/fixtures/homepage-items-dom-link.mjs';alias['next/link']=link;
for(const file of ['homepage-editor-actions','homepage-items-actions','homepage-story-actions'])for(const key of ['@/app/admin/cms/'+file,root+'src/app/admin/cms/'+file,root+'src/app/admin/cms/'+file+'.ts'])alias[key]=mock;
for(const css of ['src/components/admin/homepage/homepage-editor.css','src/components/admin/media/media-library.css'])alias[root+css]=mock;
const client=createJiti(import.meta.url,{jsx:{runtime:'automatic'},alias,fsCache:false,moduleCache:false,tryNative:false});
const test=root+'scripts/test-homepage-items-dom.mjs';
await client.evalModule(readFileSync(test,'utf8'),{filename:test,async:true});
iframeObserver.disconnect();dom.window.close();
