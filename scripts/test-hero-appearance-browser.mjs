// Real browser input + actual server actions/Phase 06 SQL in isolated PostgreSQL.
// Does not load .env.local. Both browser and database transports reject external hosts.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { mediaJiti } from './run-media-tests.mjs';
import { publishingFixture } from './fixtures/publishing-fixture.mjs';

const require = createRequire(import.meta.url), root = process.cwd();
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fixture = await publishingFixture();
const { state, db } = fixture;
state.super = true;
const jiti = mediaJiti();
const actions = await jiti.import(root + '/src/app/admin/cms/homepage-editor-actions.ts');
const workflow = await jiti.import(root + '/src/app/admin/cms/publishing-actions.ts');
const resource = { type: 'home', key: 'hero_slides' };
const id = randomUUID();
state.tables.cms_content_blocks.push({ id, page_slug:'home', section_key:'hero_slider', block_key:'slide', block_type:'image', is_active:true, sort_order:0, content:{title:{en:'A clear view of your future'},subtitle:{en:'Study abroad with UniMondo'},overlayOpacity:{en:'15',it:'18'},overlayColor:{en:'#244B50',it:'#334455'},customField:'Retain this setting'}, media:{imageUrl:'/__qa/photo.jpg',imageAlt:'Isolated landscape'}, updated_at:'2026-10-29T00:00:00.000Z' });
await state.sync();
let view = await workflow.readContentWorkflow(resource);
let result = await actions.saveHomepageEditor({kind:'slide',id,expectedUpdatedAt:view.versions.cms_content_blocks[id],patch:{title:'Approved QA headline'},inherit:[],visible:true,order:0});
assert(result.ok, result.error);
async function transition(action) {
  const current = await workflow.readContentWorkflow(resource);
  const response = await workflow.transitionContent({resource,action,version:current.document.version,approvedRevisionId:current.document.approved_revision_id});
  assert(response.ok,response.error);
  return response;
}
await transition('submit');
await transition('approve');
const publicBefore = JSON.stringify(state.tables.cms_content_blocks);
const approvedBefore = JSON.stringify((await workflow.readContentWorkflow(resource)).document);
let scenario = 'approved', saves = 0;
const temp = fs.mkdtempSync(path.join(os.tmpdir(),'unimondo-hero-browser-'));
const shots = root + '/output/hero-appearance';
fs.mkdirSync(shots,{recursive:true});
fs.writeFileSync(temp+'/loader.cjs',`const ts=require(${JSON.stringify(root+'/node_modules/typescript')});module.exports=function(source){if(${process.argv.includes('--baseline')}&&this.resourcePath.startsWith(${JSON.stringify(root+'/src/')})){const relative=this.resourcePath.slice(${root.length+1});source=require('node:child_process').execFileSync('git',['show','origin/main:'+relative],{cwd:${JSON.stringify(root)},encoding:'utf8'});}return ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText}`);
fs.writeFileSync(temp+'/empty-css.cjs',"module.exports=function(){return ''}");
fs.writeFileSync(temp+'/services.ts',`async function call(name,input){const res=await fetch('/__qa/'+name,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)});return res.json()}export function usePathname(){return '/admin/home'}export function useRouter(){return {refresh(){}}}export const readContentWorkflow=input=>call('workflow',input);export const saveHomepageEditor=input=>call('save',input);export const transitionContent=input=>call('transition',input);export const readEarlierContentRevisions=async()=>[];export const readContentRevision=async()=>({});export const saveHomepageCollection=async()=>{throw Error("Unused action")};export const saveHomepagePresentation=saveHomepageCollection;export const saveHomepageStory=saveHomepageCollection;export const hideHomepageStory=saveHomepageCollection;`);
fs.writeFileSync(temp+'/entry.tsx',`import{createRoot}from'react-dom/client';import{HomepageEditor}from'@/components/admin/homepage/homepage-editor';fetch('/__qa/initial').then(r=>r.json()).then(initial=>createRoot(document.getElementById('root')).render(<div className="um-cms" style={{display:'block'}}><main className="cms-workspace"><HomepageEditor initial={initial}/></main></div>));`);
const { webpack } = require(root+'/node_modules/next/dist/compiled/webpack/webpack');
await new Promise((resolve,reject)=>webpack({mode:'production',optimization:{minimize:false},target:'web',entry:temp+'/entry.tsx',output:{path:temp,filename:'bundle.js'},resolve:{extensions:['.tsx','.ts','.js','.mjs'],modules:[root+'/node_modules','node_modules'],alias:{'next/navigation':temp+'/services.ts','@/app/admin/cms/homepage-editor-actions':temp+'/services.ts','@/app/admin/cms/publishing-actions':temp+'/services.ts','@/app/admin/cms/homepage-items-actions':temp+'/services.ts','@/app/admin/cms/homepage-story-actions':temp+'/services.ts','@':root+'/src'}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:temp+'/loader.cjs'},{test:/\.css$/,use:temp+'/empty-css.cjs'}]},performance:{hints:false}},(error,stats)=>error||stats.hasErrors()?reject(error||new Error(stats.toString({all:false,errors:true}))):resolve()));
const cssDir = root+'/.next/static/chunks';
const css = fs.readdirSync(cssDir).filter(n=>n.endsWith('.css')).map(n=>fs.readFileSync(cssDir+'/'+n,'utf8')).join('\n');
assert(css.includes('.hp-workspace'),'Run npm run build before browser verification');
const fontClasses = ['font-sans','font-editorial'].map(name=>css.match(new RegExp('(\\.[\\w-]+)\\{--'+name+':[^}]+\\}'))?.[1].slice(1)||'').join(' ');
const image = process.env.HERO_QA_IMAGE ? await sharp(process.env.HERO_QA_IMAGE).resize(1120,800,{fit:'cover'}).jpeg().toBuffer() : await sharp({create:{width:1120,height:800,channels:3,background:'#8bb3cd'}}).composite([{input:Buffer.from('<svg width="1120" height="800"><path d="M0 600L200 200L400 600L700 160L1120 600V800H0Z" fill="#41634d"/><path d="M350 800L650 400L800 800Z" fill="#f1e7cc"/></svg>')}]).jpeg().toBuffer();
const initial = () => ({available:true,site:{},blocks:state.tables.cms_content_blocks,openings:[],stories:[],references:{countries:[],universities:[],programs:[],available:true},editableStories:{rows:[],available:true},permissions:{editHome:true,viewSlides:true,editSlides:scenario!=='view-only',createSlides:scenario!=='view-only',viewCta:true,editCta:true}});
let base, browser;
const server = http.createServer(async(req,res)=>{
  try {
    const url = new URL(req.url,base||'http://127.0.0.1');
    if(url.pathname==='/bundle.js'){res.setHeader('Content-Type','text/javascript; charset=utf-8');res.end(fs.readFileSync(temp+'/bundle.js'));return;}
    if(url.pathname==='/style.css'){res.setHeader('Content-Type','text/css; charset=utf-8');res.end(css);return;}
    if(url.pathname.startsWith('/media/')){const filename=path.basename(url.pathname);res.setHeader('Content-Type','font/woff2');res.end(fs.readFileSync(root+'/.next/static/media/'+filename));return;}
    if(url.pathname==='/__qa/photo.jpg'||url.pathname==='/_next/image'){res.setHeader('Content-Type','image/jpeg');res.end(image);return;}
    if(url.pathname.startsWith('/__qa/')){
      const chunks=[];for await(const chunk of req)chunks.push(chunk);
      const input=chunks.length?JSON.parse(Buffer.concat(chunks)):null;
      let output;
      if(url.pathname==='/__qa/initial')output=initial();
      else if(url.pathname==='/__qa/workflow'){
        output=await workflow.readContentWorkflow(input);
        if(scenario==='missing')output={...output,ready:false,error:'Private drafting setup is unavailable.',document:null};
        if(scenario==='view-only')output={...output,permissions:{...output.permissions,edit:false,isSuper:false}};
      }
      else if(url.pathname==='/__qa/save'){saves++;output=await actions.saveHomepageEditor(input);}
      else if(url.pathname==='/__qa/transition'){assert.notEqual(input.action,'publish','Publishing is never activated or attempted');output=await workflow.transitionContent(input);}
      else throw new Error('Unexpected endpoint '+url.pathname);
      res.setHeader('Content-Type','application/json');res.end(JSON.stringify(output));return;
    }
    if(url.pathname!=='/') {res.writeHead(404).end();return;}
    res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><html class="'+fontClasses+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script>window.process={env:{NEXT_PUBLIC_SUPABASE_URL:"https://media-tests.invalid"}}</script><script src="/bundle.js"></script></body></html>');
  }catch(error){console.error(error);res.writeHead(500).end(String(error));}
}).listen(0,'127.0.0.1');
await new Promise(resolve=>server.once('listening',resolve));base=`http://127.0.0.1:${server.address().port}`;
try {
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1660,height:1080},reducedMotion:'reduce'}), errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  const visit=async()=>{await page.goto(base);await page.getByRole('group',{name:'Image and text appearance'}).waitFor();await page.waitForFunction(()=>!document.querySelector('.hp-work-state')?.textContent.includes('Loading'));};
  const sliders=()=>page.locator('input[type=range]');
  const frame=()=>page.frameLocator('.hp-preview-panel > .hp-preview-frame-wrap > iframe');
  const appearance=async()=>frame().locator('section').evaluate(section=>({filter:section.querySelector('img').style.filter,overlay:[...section.children].filter(el=>el.style.backgroundColor&&el.style.opacity).map(el=>({inline:el.style.opacity,computed:getComputedStyle(el).opacity,color:getComputedStyle(el).backgroundColor})),textOpacity:getComputedStyle(section.querySelector('.um-hero-copy')).opacity,backing:getComputedStyle(section.querySelector('h1 span')).backgroundColor}));
  await visit();await frame().locator('img').waitFor();
  if(process.argv.includes('--diagnose')||process.argv.includes('--baseline')){
    console.log(JSON.stringify({status:'approved',publicationEnabled:false,disabled:await sliders().evaluateAll(nodes=>nodes.map(n=>n.matches(':disabled'))),appearance:await appearance()},null,2));
  }else{
    // Assertions and real pointer/keyboard regression scenarios follow below.
    assert.equal(await sliders().count(),3);
    assert.equal(await page.getByText('You can preview this content. Your current permissions do not allow saving this selection.',{exact:true}).count(),0,'Approved lock must not be described as missing permission');
    for(const slider of await sliders().all())assert(await slider.isEnabled(),'Approved appearance preview must remain operable');

    const slider = name => page.getByRole('slider',{name,exact:true});
    const drag = async(name,fraction) => {
      const control=slider(name);await control.scrollIntoViewIfNeeded();const box=await control.boundingBox();
      const before=await control.inputValue();
      await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
      await page.mouse.move(box.x+box.width*fraction,box.y+box.height/2,{steps:10});await page.mouse.up();
      assert.notEqual(await control.inputValue(),before,name+' responds to pointer drag');
      return await control.inputValue();
    };
    const check = async(brightness,contrast,opacity,colour) => {
      await page.waitForFunction(({brightness,contrast,opacity,colour})=>{
        const doc=document.querySelector('.hp-preview-panel > .hp-preview-frame-wrap > iframe')?.contentDocument;
        const img=doc?.querySelector('img'),overlay=doc?.querySelector('[data-hero-overlay]');
        return img?.style.filter===`brightness(${brightness}%) contrast(${contrast}%)`&&overlay&&Number(doc.defaultView.getComputedStyle(overlay).opacity)===Number(opacity)/100&&(!colour||overlay.style.backgroundColor===colour);
      },{brightness,contrast,opacity,colour});
      const actual=await appearance();assert.equal(actual.textOpacity,'1','Text never inherits overlay opacity');
      assert.equal(actual.backing,'rgb(255, 255, 255)','Default dark text gets a solid contrast backing');
      assert(await frame().locator('.um-hero-copy a').first().isVisible());
      assert.equal(await frame().locator('.um-hero-copy a').first().evaluate(el=>getComputedStyle(el).opacity),'1');
    };
    let brightness='100',contrast='100',opacity='15';
    await check(brightness,contrast,opacity);
    // Exercise all three native range controls with real pointer drags AND keyboard input in both iframe modes.
    for(const mode of ['Desktop','Mobile']) {
      await page.locator('.hp-preview-panel').getByRole('button',{name:mode,exact:true}).click();
      await page.waitForFunction(mode=>document.querySelector('.hp-preview-panel iframe').contentWindow.innerWidth===(mode==='Desktop'?1120:390),mode);
      opacity=await drag('Overlay opacity',0.7);await check(brightness,contrast,opacity);
      brightness=await drag('Image brightness',0.8);await check(brightness,contrast,opacity);
      contrast=await drag('Image contrast',0.3);await check(brightness,contrast,opacity);
      await slider('Overlay opacity').press('Home');opacity='0';await check(brightness,contrast,opacity);
      await slider('Overlay opacity').press('ArrowRight');opacity='1';await check(brightness,contrast,opacity);
      await slider('Image brightness').press('End');brightness='150';await check(brightness,contrast,opacity);
      await slider('Image brightness').press('ArrowLeft');brightness='149';await check(brightness,contrast,opacity);
      await slider('Image contrast').press('Home');contrast='50';await check(brightness,contrast,opacity);
      await slider('Image contrast').press('ArrowRight');contrast='51';await check(brightness,contrast,opacity);
      await page.getByRole('button',{name:'Overlay #000000',exact:true}).click();
      await check(brightness,contrast,opacity,'rgb(0, 0, 0)');
      const hex=page.getByRole('textbox',{name:'Overlay hex colour',exact:true});await hex.click();await hex.press('ControlOrMeta+A');await hex.pressSequentially('#aabbcc');
      await check(brightness,contrast,opacity,'rgb(170, 187, 204)');
      assert.equal(await page.getByLabel('Overlay colour',{exact:true}).inputValue(),'#aabbcc');
      assert(await page.locator('.hp-preview-panel > .hp-preview-toolbar .hp-preview-state').getByText('Unsaved preview',{exact:true}).isVisible());
      assert(await page.getByRole('button',{name:'Save Draft',exact:true}).isDisabled(),'Approved content cannot be saved');
      await page.locator('.hp-preview-panel').screenshot({path:shots+'/'+mode.toLowerCase()+'-unsaved.png'});
    }
    assert.equal(saves,0);assert.equal(JSON.stringify((await workflow.readContentWorkflow(resource)).document),approvedBefore,'Preview never alters approved draft');
    assert.equal(JSON.stringify(state.tables.cms_content_blocks),publicBefore,'Preview never writes published rows');
    const discard=async()=>{page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Discard changes',exact:true}).click();};
    await discard();brightness='100';contrast='100';opacity='15';await check(brightness,contrast,opacity);
    await page.locator('.hp-preview-panel').getByRole('button',{name:'Desktop',exact:true}).click();
    await page.locator('.hp-preview-panel').screenshot({path:shots+'/desktop-default.png'});
    await page.getByRole('button',{name:'Return to Draft',exact:true}).click();
    await page.getByText('Saved private draft',{exact:true}).first().waitFor();
    await slider('Image brightness').press('End');await slider('Image contrast').press('Home');await slider('Overlay opacity').press('End');
    await page.getByRole('button',{name:'Overlay #000000',exact:true}).click();
    await page.getByRole('button',{name:'Save Draft',exact:true}).click();
    await page.getByText('Private draft saved. The public homepage has not changed.',{exact:true}).waitFor();
    assert.equal(saves,1);
    let savedView=await workflow.readContentWorkflow(resource);
    const savedSlide=savedView.document.proposed.tables.cms_content_blocks.find(row=>row.id===id);
    const english=value=>typeof value==='string'?value:value?.en;
    for(const [key,value] of Object.entries({brightness:'150',contrast:'50',overlayOpacity:'100',overlayColor:'#000000'})) assert.equal(english(savedSlide.content[key]),value,key+' persists in an existing slide draft');
    assert.equal(savedSlide.content.overlayOpacity.it,'18','Other locale appearance is retained');
    assert.equal(savedSlide.content.overlayColor.it,'#334455');assert.equal(savedSlide.content.customField,'Retain this setting');
    assert.equal(JSON.stringify(state.tables.cms_content_blocks),publicBefore,'Private save never writes published rows');
    await visit();await check('150','50','100','rgb(0, 0, 0)');
    assert(await page.locator('.hp-preview-panel > .hp-preview-toolbar .hp-preview-state').getByText('Saved private draft',{exact:true}).isVisible());
    await page.getByRole('button',{name:'View Published Version',exact:true}).click();
    await check('100','100','15','rgb(36, 75, 80)');
    for(const control of await sliders().all())assert(await control.isDisabled(),'Explicit published view is read-only');
    assert(await page.locator('.hp-preview-panel > .hp-preview-toolbar .hp-preview-state').getByText('Published appearance',{exact:true}).isVisible());
    await page.getByRole('button',{name:'View Draft Preview',exact:true}).click();await check('150','50','100');
    await page.getByRole('button',{name:'Submit for Review',exact:true}).click();
    await page.getByText('Saved draft · in review',{exact:true}).first().waitFor().catch(async error=>{console.error('Review state:',await page.locator('[aria-label="Content publishing workflow"]').innerText());throw error;});
    await slider('Overlay opacity').press('Home');await check('150','50','0');
    assert(await page.getByRole('button',{name:'Save Draft',exact:true}).isDisabled());await discard();
    await page.getByRole('button',{name:'Approve',exact:true}).click();
    await page.getByRole('button',{name:'Publish',exact:true}).waitFor();
    assert(await page.getByRole('button',{name:'Publish',exact:true}).isDisabled(),'Disabled cutover remains enforced');
    assert(await page.getByText('Private drafting and review are available.',{exact:false}).isVisible());
    scenario='view-only';await visit();for(const control of await sliders().all())assert(await control.isDisabled(),'No edit permission means no local editing');
    scenario='missing';await visit();
    assert(await page.getByText('Local appearance preview only.',{exact:false}).isVisible());
    await slider('Overlay opacity').press('Home');await check('100','100','0');
    assert(await page.getByRole('button',{name:'Save Draft',exact:true}).isDisabled());
    await discard();scenario='approved';
    await page.setViewportSize({width:390,height:844});await visit();
    await drag('Overlay opacity',0.3);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No narrow-screen overflow');
    await page.getByRole('button',{name:'Overlay #FFFFFF',exact:true}).click();
    await page.screenshot({path:shots+'/narrow-editor.png',fullPage:true});
    await discard();
    assert.equal((await db.query('select enabled from cms_publishing_settings where id=1')).rows[0].enabled,false);
    assert.equal(JSON.stringify(state.tables.cms_content_blocks),publicBefore);
    console.log('PASS: actual Chromium pointer drags + native range keyboard events; colour preset clicks + hex keyboard input; instant desktop/mobile iframe updates; independent filters/overlay, including 0%, 1% and 100%; fully opaque text and buttons; approved/in-review preview-only states; saved existing-slide appearance and reload; locale/unknown-setting preservation; published/draft distinction; view-only and unavailable-workflow handling; 390px editor; actual Phase 06 actions + PostgreSQL with publication disabled and zero public writes. Screenshots: output/hero-appearance.');

  }
  assert.deepEqual(errors,[]);
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));await fixture.close();fs.rmSync(temp,{recursive:true,force:true});}
